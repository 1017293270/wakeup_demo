async function request(url, init) {
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...init
    });
    const body = (await response.json());
    if (!response.ok || !body.success) {
        throw new Error(body.error?.message || '请求失败');
    }
    return body.data;
}
export function getConfig() {
    return request('/api/v1/config');
}
export function saveConfig(config) {
    return request('/api/v1/config', {
        method: 'PUT',
        body: JSON.stringify(config)
    });
}
export function reloadConfig() {
    return request('/api/v1/config/reload', {
        method: 'POST'
    });
}
export function getHistory(keyword = '') {
    const params = new URLSearchParams();
    if (keyword)
        params.set('keyword', keyword);
    return request(`/api/v1/history?${params.toString()}`);
}
export function clearHistory() {
    return request('/api/v1/history', {
        method: 'DELETE'
    });
}
//# sourceMappingURL=configApi.js.map