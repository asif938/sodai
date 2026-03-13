// SSE broadcast utility - shared in-memory set of clients
// In production, use Redis pub/sub instead

export const clients = new Set();

export function broadcast(event) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of clients) {
        try {
            client.enqueue(new TextEncoder().encode(data));
        } catch {
            clients.delete(client);
        }
    }
}
