use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyStatus {
    pub running: bool,
    pub port: u16,
    pub endpoint: String,
    /// Set when the proxy binds all interfaces, so the dashboard can offer a URL
    /// that Docker containers and other devices can reach.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lan_endpoint: Option<String>,
}

impl Default for ProxyStatus {
    fn default() -> Self {
        Self {
            running: false,
            port: 8317,
            endpoint: "http://localhost:8317/v1".to_string(),
            lan_endpoint: None,
        }
    }
}
