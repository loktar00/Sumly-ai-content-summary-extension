export interface ModelConfig {
    name: string;
    url: string;
    api_endpoint: string;
    model: string;
    num_ctx?: number;
    model_selection?: boolean;
    api_key?: string;
}