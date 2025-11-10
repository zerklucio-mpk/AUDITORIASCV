export const generateFileName = (prefix: string, extension: string): string => {
    return `${prefix}_${new Date().toISOString().split('T')[0]}.${extension}`;
}

export const getImageDimensions = (base64OrUrl: string): Promise<{ width: number, height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = (err) => reject(`Could not load image: ${err}`);
        img.src = base64OrUrl;
    });
};

export const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = atob(base64.replace(/^data:image\/[a-z]+;base64,/, ''));
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

export const fetchImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                }
                return response.blob();
            })
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
                reader.onerror = () => {
                    reject('Failed to read blob as base64');
                };
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                console.error('Error fetching image for report:', error);
                // Return a placeholder or reject to handle the error upstream
                // For simplicity, rejecting. Can be changed to return a placeholder base64 string.
                reject(error);
            });
    });
};