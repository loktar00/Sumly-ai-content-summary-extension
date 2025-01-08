export function formatSize(bytes: number): string {
    if (bytes === 0) {
        return '0 B';
    }

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());

    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}