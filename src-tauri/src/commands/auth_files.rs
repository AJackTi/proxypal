//! Auth Files Management - via Management API

use crate::state::AppState;
use crate::types::{self, AuthConnectionTestResult, AuthConnectionTestStatus, AuthFile};
use crate::utils::detect_provider_from_filename;
use crate::{build_management_client, get_management_key, get_management_url};
use std::path::{Path, PathBuf};
use tauri::State;

#[derive(Debug, PartialEq)]
struct AuthProbe {
    url: &'static str,
    headers: Vec<(&'static str, String)>,
}

fn auth_probe(provider: &str, account_id: Option<&str>) -> Option<AuthProbe> {
    let provider = provider.trim().to_lowercase();
    let bearer_headers = || {
        vec![
            ("Authorization", "Bearer $TOKEN$".to_string()),
            ("Accept", "application/json".to_string()),
            ("User-Agent", "ProxyPal/1.0".to_string()),
        ]
    };

    if provider.contains("codex") {
        let mut headers = bearer_headers();
        if let Some(account_id) = account_id.filter(|value| !value.trim().is_empty()) {
            headers.push(("ChatGPT-Account-Id", account_id.trim().to_string()));
        }
        return Some(AuthProbe {
            url: "https://chatgpt.com/backend-api/wham/usage",
            headers,
        });
    }

    if provider.contains("claude") || provider.contains("anthropic") {
        let mut headers = bearer_headers();
        headers.push(("anthropic-beta", "oauth-2025-04-20".to_string()));
        return Some(AuthProbe {
            url: "https://api.anthropic.com/api/oauth/usage",
            headers,
        });
    }

    if provider.contains("gemini") || provider.contains("antigravity") {
        return Some(AuthProbe {
            url: "https://www.googleapis.com/oauth2/v2/userinfo?alt=json",
            headers: bearer_headers(),
        });
    }

    None
}

fn classify_probe_status(status_code: u16, latency_ms: u64) -> AuthConnectionTestResult {
    if (200..300).contains(&status_code) {
        return AuthConnectionTestResult {
            status: AuthConnectionTestStatus::Passed,
            message: "Connection successful".to_string(),
            latency_ms: Some(latency_ms),
        };
    }

    if status_code == 429 {
        return AuthConnectionTestResult {
            status: AuthConnectionTestStatus::Passed,
            message: "Authentication succeeded, but the account is rate limited".to_string(),
            latency_ms: Some(latency_ms),
        };
    }

    let message = match status_code {
        401 | 403 => "Authentication was rejected by the provider".to_string(),
        _ => format!("Provider returned HTTP {}", status_code),
    };
    AuthConnectionTestResult {
        status: AuthConnectionTestStatus::Failed,
        message,
        latency_ms: Some(latency_ms),
    }
}

fn local_auth_file_candidates(filename: &str) -> Option<Vec<PathBuf>> {
    let requested = Path::new(filename);
    let basename = requested.file_name()?.to_str()?;
    if basename != filename || basename == "." || basename == ".." {
        return None;
    }

    let auth_dir = dirs::home_dir()?.join(".cli-proxy-api");
    let mut candidates = vec![auth_dir.join(basename)];
    if !basename.ends_with(".json") {
        candidates.push(auth_dir.join(format!("{basename}.json")));
    }
    if !basename.ends_with(".json.disabled") {
        candidates.push(auth_dir.join(format!("{basename}.json.disabled")));
    }
    Some(candidates)
}

fn auth_file_delete_url(port: u16, filename: &str) -> Result<reqwest::Url, String> {
    let mut url = reqwest::Url::parse(&get_management_url(port, "auth-files"))
        .map_err(|error| format!("Failed to build auth file delete URL: {error}"))?;
    url.query_pairs_mut().append_pair("name", filename);
    Ok(url)
}

async fn read_local_auth_file(filename: &str) -> Option<Vec<u8>> {
    let candidates = local_auth_file_candidates(filename)?;
    tokio::task::spawn_blocking(move || {
        candidates
            .into_iter()
            .find_map(|path| std::fs::read(path).ok())
    })
    .await
    .ok()
    .flatten()
}

// Get all auth files
#[tauri::command]
pub async fn get_auth_files(state: State<'_, AppState>) -> Result<Vec<AuthFile>, String> {
    let port = state
        .config
        .lock()
        .map_err(|error| format!("Failed to read proxy configuration: {}", error))?
        .port;
    let url = get_management_url(port, "auth-files");

    // 1. Fetch active files from Management API
    let mut files: Vec<AuthFile> = Vec::new();

    // Only try to fetch if proxy is running
    let proxy_running = state.proxy_status.lock().unwrap().running;
    if proxy_running {
        let client = build_management_client();
        match client
            .get(&url)
            .header("X-Management-Key", &get_management_key())
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    if let Ok(json) = response.json::<serde_json::Value>().await {
                        let files_array = if let Some(files) = json.get("files") {
                            files.clone()
                        } else if json.is_array() {
                            json
                        } else {
                            serde_json::Value::Array(Vec::new())
                        };

                        if let Ok(parsed) = serde_json::from_value::<Vec<AuthFile>>(files_array) {
                            files = parsed;
                        }
                    }
                }
            }
            Err(_) => {
                // Ignore connection errors if proxy just stopped
            }
        }
    }

    // 2. Scan auth directory on the filesystem for any files the Management API may have missed
    // (e.g. proxy not running, or disabled files never returned by the API).
    let auth_dir = dirs::home_dir()
        .ok_or("Could not find home directory")?
        .join(".cli-proxy-api");

    if auth_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&auth_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = match path.file_name().and_then(|n| n.to_str()) {
                    Some(n) => n.to_string(),
                    None => continue,
                };

                // ---- Active auth files (.json) not already returned by Management API ----
                if name.ends_with(".json") && !name.ends_with(".json.disabled") {
                    // Check if Management API already returned this file (by name)
                    let already_listed = files.iter().any(|f| f.name == name || f.id == name);
                    if !already_listed {
                        let provider = detect_provider_from_filename(&name);

                        let stem = name.strip_suffix(".json").unwrap_or(&name).to_string();
                        files.push(AuthFile {
                            id: stem.clone(),
                            auth_index: None,
                            name: name.clone(),
                            provider: provider.to_string(),
                            status: "active".to_string(),
                            disabled: false,
                            unavailable: false,
                            runtime_only: false,
                            source: Some("file".to_string()),
                            path: Some(path.to_string_lossy().to_string()),
                            size: Some(entry.metadata().map(|m| m.len()).unwrap_or(0)),
                            modtime: Some(
                                entry
                                    .metadata()
                                    .ok()
                                    .and_then(|m| m.modified().ok())
                                    .map(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339())
                                    .unwrap_or_default(),
                            ),
                            email: None,
                            account_type: None,
                            account: None,
                            label: None,
                            status_message: None,
                            created_at: None,
                            updated_at: None,
                            last_refresh: None,
                            success_count: None,
                            failure_count: None,
                            priority: None,
                            note: None,
                        });
                    }
                }

                // ---- Disabled auth files (.json.disabled) ----
                if name.ends_with(".json.disabled") {
                    // This is a disabled auth file
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                            // Try to extract provider/email for metadata
                            let provider = json
                                .get("provider")
                                .and_then(|v| v.as_str())
                                .unwrap_or("unknown")
                                .to_string();

                            let dummy_id = name
                                .strip_suffix(".json.disabled")
                                .unwrap_or(&name)
                                .to_string();

                            // Create AuthFile entry for this disabled file
                            let disabled_file = AuthFile {
                                id: dummy_id.clone(),
                                auth_index: None,
                                name: dummy_id,
                                provider,
                                status: "disabled".to_string(),
                                disabled: true,
                                unavailable: false,
                                runtime_only: false,
                                source: Some("file".to_string()),
                                path: Some(path.to_string_lossy().to_string()),
                                size: Some(entry.metadata().map(|m| m.len()).unwrap_or(0)),
                                modtime: Some(
                                    entry
                                        .metadata()
                                        .ok()
                                        .and_then(|m| m.modified().ok())
                                        .map(|t| {
                                            chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339()
                                        })
                                        .unwrap_or_default(),
                                ),
                                email: None,
                                account_type: None,
                                account: None,
                                created_at: None,
                                updated_at: None,
                                last_refresh: None,
                                success_count: None,
                                failure_count: None,
                                label: None,
                                status_message: None,
                                priority: None,
                                note: None,
                            };

                            files.push(disabled_file);
                        }
                    }
                }
            }
        }
    }

    Ok(files)
}

/// Test one concrete auth entry through CLIProxyAPI's management `api-call`
/// endpoint. Unlike a normal proxy request, `auth_index` pins the request to
/// the requested credential and cannot silently fall back to another account.
#[tauri::command]
pub async fn test_auth_file_connection(
    state: State<'_, AppState>,
    auth_index: String,
    provider: String,
    file_name: String,
) -> Result<AuthConnectionTestResult, String> {
    if auth_index.trim().is_empty() {
        return Ok(AuthConnectionTestResult {
            status: AuthConnectionTestStatus::Skipped,
            message: "This proxy version does not expose an auth index for this file".to_string(),
            latency_ms: None,
        });
    }

    let account_id = match read_local_auth_file(&file_name).await {
        Some(content) => {
            let json = serde_json::from_slice::<serde_json::Value>(&content)
                .map_err(|error| format!("Failed to parse auth file metadata: {}", error))?;
            json.get("account_id")
                .or_else(|| json.get("accountId"))
                .and_then(|value| value.as_str())
                .map(str::to_string)
        }
        None => None,
    };

    let Some(probe) = auth_probe(&provider, account_id.as_deref()) else {
        return Ok(AuthConnectionTestResult {
            status: AuthConnectionTestStatus::Skipped,
            message: format!("No reliable per-account connection probe for {}", provider),
            latency_ms: None,
        });
    };

    let port = state
        .config
        .lock()
        .map_err(|error| format!("Failed to read proxy configuration: {}", error))?
        .port;
    let url = get_management_url(port, "api-call");
    let headers = probe
        .headers
        .into_iter()
        .map(|(key, value)| (key.to_string(), value))
        .collect::<std::collections::HashMap<_, _>>();
    let payload = serde_json::json!({
        "auth_index": auth_index,
        "method": "GET",
        "url": probe.url,
        "header": headers,
    });

    let started = std::time::Instant::now();
    let response = build_management_client()
        .post(&url)
        .header("X-Management-Key", &get_management_key())
        .json(&payload)
        .send()
        .await
        .map_err(|error| format!("Failed to test auth connection: {}", error))?;
    let latency_ms = started.elapsed().as_millis() as u64;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(AuthConnectionTestResult {
            status: AuthConnectionTestStatus::Skipped,
            message: "The bundled proxy does not support per-auth connection tests".to_string(),
            latency_ms: None,
        });
    }
    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .map_err(|error| format!("Failed to read Management API error response: {}", error))?;
        return Err(format!("Management API returned {}: {}", status, body));
    }

    let body = response
        .json::<serde_json::Value>()
        .await
        .map_err(|error| format!("Invalid connection test response: {}", error))?;
    let status_code =
        body.get("status_code")
            .or_else(|| body.get("statusCode"))
            .and_then(|value| value.as_u64())
            .ok_or("Connection test response did not include a status code")? as u16;

    Ok(classify_probe_status(status_code, latency_ms))
}

// Upload auth file
#[tauri::command]
pub async fn upload_auth_file(
    state: State<'_, AppState>,
    file_path: String,
    provider: String,
) -> Result<(), String> {
    let port = state.config.lock().unwrap().port;
    let url = get_management_url(port, "auth-files");

    // Read file content
    let content = std::fs::read(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Get filename from path
    let filename = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("auth.json")
        .to_string();

    let client = build_management_client();

    // Create multipart form
    let part = reqwest::multipart::Part::bytes(content)
        .file_name(filename.clone())
        .mime_str("application/json")
        .map_err(|e| e.to_string())?;

    let form = reqwest::multipart::Form::new()
        .text("provider", provider)
        .text("filename", filename)
        .part("file", part);

    let response = client
        .post(&url)
        .header("X-Management-Key", &get_management_key())
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Failed to upload auth file: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to upload auth file: {} - {}", status, text));
    }

    Ok(())
}

// Delete auth file
#[tauri::command]
pub async fn delete_auth_file(state: State<'_, AppState>, file_id: String) -> Result<(), String> {
    // Check if it's a disabled file first (file_id matches filename without extension usually)
    let auth_dir = dirs::home_dir()
        .ok_or("Could not find home directory")?
        .join(".cli-proxy-api");

    let disabled_path = auth_dir.join(format!("{}.json.disabled", file_id));
    if disabled_path.exists() {
        std::fs::remove_file(disabled_path)
            .map_err(|e| format!("Failed to delete disabled file: {}", e))?;
        return Ok(());
    }

    // Otherwise try to delete via API
    let port = state.config.lock().unwrap().port;
    let url = auth_file_delete_url(port, &file_id)?;

    let client = build_management_client();
    let response = client
        .delete(url)
        .header("X-Management-Key", &get_management_key())
        .send()
        .await
        .map_err(|e| format!("Failed to delete auth file: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to delete auth file: {} - {}", status, text));
    }

    Ok(())
}

// Toggle auth file enabled/disabled via management API (CLIProxyAPI v6.7.18+)
// Fallback: manually rename file to .json.disabled if API returns 404
#[tauri::command]
pub async fn toggle_auth_file(
    state: State<'_, AppState>,
    file_name: String,
    disabled: bool,
) -> Result<(), String> {
    let port = {
        let config = state.config.lock().unwrap();
        config.port
    };

    // Use the new PATCH endpoint from CLIProxyAPI v6.7.18
    // Endpoint: PATCH /v0/management/auth-files/status
    // Body: { "name": "filename.json", "disabled": true/false }
    let url = get_management_url(port, "auth-files/status");

    let client = build_management_client();
    let response_res = client
        .patch(&url)
        .header("X-Management-Key", &get_management_key())
        .json(&serde_json::json!({
            "name": file_name,
            "disabled": disabled
        }))
        .send()
        .await;

    match response_res {
        Ok(response) if response.status().is_success() => Ok(()),
        Ok(response) if response.status().as_u16() == 404 => {
            // API not found (old version), fallback to manual file renaming
            let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
            let auth_dir = home_dir.join(".cli-proxy-api");

            let current_name = if !disabled {
                format!("{}.disabled", file_name)
            } else {
                file_name.clone()
            };

            let new_name = if disabled {
                format!("{}.disabled", file_name)
            } else {
                file_name.clone()
            };

            let current_path = auth_dir.join(&current_name);
            let new_path = auth_dir.join(&new_name);

            if current_path.exists() {
                std::fs::rename(&current_path, &new_path)
                    .map_err(|e| format!("Manual toggle failed: {}", e))?;
                Ok(())
            } else {
                Err(format!("Auth file not found: {:?}", current_path))
            }
        }
        Ok(response) => {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            Err(format!(
                "Failed to toggle auth file: {} - {}",
                status, error_text
            ))
        }
        Err(e) => Err(format!("Failed to toggle auth file: {}", e)),
    }
}

// Download auth file - returns path to temp file
#[tauri::command]
pub async fn download_auth_file(
    state: State<'_, AppState>,
    _file_id: String,
    filename: String,
) -> Result<String, String> {
    let port = state.config.lock().unwrap().port;
    let url = get_management_url(port, "auth-files/download");

    let client = build_management_client();
    let response = client
        .get(&url)
        // Auth filenames may contain `+` (for example in email addresses).
        // Encode the query via reqwest so `+` is not decoded as a space.
        .query(&[("name", filename.as_str())])
        .header("X-Management-Key", &get_management_key())
        .send()
        .await
        .map_err(|e| format!("Failed to download auth file: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        if status == reqwest::StatusCode::NOT_FOUND {
            if let Some(bytes) = read_local_auth_file(&filename).await {
                let downloads_dir =
                    dirs::download_dir().unwrap_or_else(|| dirs::home_dir().unwrap_or_default());
                let dest_path = downloads_dir.join(&filename);
                let write_path = dest_path.clone();
                tokio::task::spawn_blocking(move || std::fs::write(write_path, bytes))
                    .await
                    .map_err(|e| format!("Failed to save file: {}", e))?
                    .map_err(|e| format!("Failed to save file: {}", e))?;
                return Ok(dest_path.to_string_lossy().to_string());
            }
        }
        let text = response.text().await.unwrap_or_default();
        return Err(format!(
            "Failed to download auth file: {} - {}",
            status, text
        ));
    }

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    // Save to downloads directory
    let downloads_dir =
        dirs::download_dir().unwrap_or_else(|| dirs::home_dir().unwrap_or_default());

    let dest_path = downloads_dir.join(&filename);
    let write_path = dest_path.clone();
    tokio::task::spawn_blocking(move || std::fs::write(write_path, bytes))
        .await
        .map_err(|e| format!("Failed to save file: {}", e))?
        .map_err(|e| format!("Failed to save file: {}", e))?;

    Ok(dest_path.to_string_lossy().to_string())
}

// Delete all auth files
#[tauri::command]
pub async fn delete_all_auth_files(state: State<'_, AppState>) -> Result<(), String> {
    let port = state.config.lock().unwrap().port;
    let url = format!("{}?all=true", get_management_url(port, "auth-files"));

    let client = build_management_client();
    let response = client
        .delete(&url)
        .header("X-Management-Key", &get_management_key())
        .send()
        .await
        .map_err(|e| format!("Failed to delete all auth files: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!(
            "Failed to delete all auth files: {} - {}",
            status, text
        ));
    }

    Ok(())
}

// Batch delete selected auth files (CLIProxyAPI v6.9.2+ supports batch operations)
// Falls back to sequential single deletes if batch endpoint is unavailable.
#[tauri::command]
pub async fn batch_delete_auth_files(
    state: State<'_, AppState>,
    file_ids: Vec<String>,
) -> Result<serde_json::Value, String> {
    let port = state.config.lock().unwrap().port;
    let client = build_management_client();
    let management_key = get_management_key();

    // Try batch endpoint first (CLIProxyAPI v6.9.2+)
    let batch_url = get_management_url(port, "auth-files/batch");
    let batch_body = serde_json::json!({ "names": file_ids, "action": "delete" });
    let batch_result = client
        .delete(&batch_url)
        .header("X-Management-Key", &management_key)
        .json(&batch_body)
        .send()
        .await;

    match batch_result {
        Ok(resp) if resp.status().is_success() => {
            return Ok(serde_json::json!({
                "deleted": file_ids.len(),
                "method": "batch"
            }));
        }
        Ok(resp) if resp.status().as_u16() == 404 => {
            // Batch endpoint not available, fall through to sequential
        }
        _ => {
            // Network error or other failure, fall through to sequential
        }
    }

    // Fallback: delete one by one
    let mut deleted = 0u32;
    let mut errors: Vec<String> = Vec::new();
    let auth_dir = dirs::home_dir()
        .ok_or("Could not find home directory")?
        .join(".cli-proxy-api");
    for file_id in &file_ids {
        // Check if it's a disabled file on disk
        let disabled_path = auth_dir.join(format!("{}.json.disabled", file_id));
        if disabled_path.exists() {
            match std::fs::remove_file(&disabled_path) {
                Ok(_) => {
                    deleted += 1;
                }
                Err(e) => errors.push(format!("{}: {}", file_id, e)),
            }
            continue;
        }

        let url = get_management_url(port, "auth-files");
        match client
            .delete(&url)
            .query(&[("name", file_id.as_str())])
            .header("X-Management-Key", &management_key)
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                deleted += 1;
            }
            Ok(resp) => {
                let text = resp.text().await.unwrap_or_default();
                errors.push(format!("{}: {}", file_id, text));
            }
            Err(e) => errors.push(format!("{}: {}", file_id, e)),
        }
    }

    Ok(serde_json::json!({
        "deleted": deleted,
        "errors": errors,
        "method": "sequential"
    }))
}

#[cfg(test)]
mod tests {
    use super::{
        auth_file_delete_url, auth_probe, classify_probe_status, local_auth_file_candidates,
    };
    use crate::types::AuthConnectionTestStatus;

    #[test]
    fn local_candidates_reject_path_traversal() {
        assert!(local_auth_file_candidates("../secret.json").is_none());
    }

    #[test]
    fn local_candidates_include_disabled_file_variant() {
        let candidates = local_auth_file_candidates("codex-account").unwrap();
        assert!(candidates
            .iter()
            .any(|path| path.ends_with("codex-account.json")));
        assert!(candidates
            .iter()
            .any(|path| path.ends_with("codex-account.json.disabled")));
    }

    #[test]
    fn delete_url_preserves_plus_in_auth_filename() {
        let filename = "codex-user+tag@example.com-plus.json";
        let url = auth_file_delete_url(8317, filename).unwrap();

        assert!(url.as_str().contains("user%2Btag"));
        assert_eq!(
            url.query_pairs().find(|(key, _)| key == "name").unwrap().1,
            filename
        );
    }

    #[test]
    fn codex_probe_targets_usage_api_and_includes_account_id() {
        let probe = auth_probe("codex", Some("account-123")).unwrap();
        assert_eq!(probe.url, "https://chatgpt.com/backend-api/wham/usage");
        assert!(probe
            .headers
            .iter()
            .any(|(key, value)| *key == "ChatGPT-Account-Id" && value == "account-123"));
    }

    #[test]
    fn unsupported_provider_has_no_probe() {
        assert!(auth_probe("unknown-provider", None).is_none());
    }

    #[test]
    fn rate_limit_still_proves_authentication() {
        let result = classify_probe_status(429, 42);
        assert!(matches!(result.status, AuthConnectionTestStatus::Passed));
    }

    #[test]
    fn unauthorized_probe_fails() {
        let result = classify_probe_status(401, 42);
        assert!(matches!(result.status, AuthConnectionTestStatus::Failed));
    }
}

// ==========================================================================
// Proxy Auth Status Verification (CLIProxyAPI v6.6.72+)
// ==========================================================================

// Verify auth status from CLIProxyAPI's /api/auth/status endpoint
#[tauri::command]
pub async fn verify_proxy_auth_status(
    state: State<'_, AppState>,
) -> Result<types::ProxyAuthStatus, String> {
    let port = state.config.lock().unwrap().port;

    // Check if proxy is running first
    let proxy_running = state.proxy_status.lock().unwrap().running;
    if !proxy_running {
        return Ok(types::ProxyAuthStatus::default());
    }

    // The new endpoint in CLIProxyAPI v6.6.72+ is /api/auth/status
    let url = format!("http://127.0.0.1:{}/api/auth/status", port);

    let client = build_management_client();
    let response = client
        .get(&url)
        .header("X-Management-Key", &get_management_key())
        .send()
        .await
        .map_err(|e| format!("Failed to verify auth status: {}", e))?;

    if !response.status().is_success() {
        // Fallback: endpoint might not exist in older CLIProxyAPI versions
        return Ok(types::ProxyAuthStatus {
            status: "unsupported".to_string(),
            providers: types::ProxyAuthProviders::default(),
        });
    }

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    // Convert snake_case to camelCase if needed
    let json_str = serde_json::to_string(&json).map_err(|e| e.to_string())?;
    let converted = json_str
        .replace("\"account_count\"", "\"accounts\"")
        .replace("\"error_message\"", "\"error\"");

    serde_json::from_str(&converted).map_err(|e| format!("Failed to parse auth status: {}", e))
}
