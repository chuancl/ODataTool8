
import { ODataVersion } from './types';

// 1. Detect OData Version
export const detectODataVersion = async (urlOrXml: string, isContent = false): Promise<ODataVersion> => {
    try {
        let content = urlOrXml;
        if (!isContent) {
            const res = await fetch(urlOrXml);
            if (!res.ok) throw new Error("Failed to fetch");
            content = await res.text();
        }

        if (content.includes('Version="4.0"')) return 'V4';
        if (content.includes('Version="1.0"') && content.includes('DataServiceVersion="2.0"')) return 'V2';
        if (content.includes('Version="1.0"') && content.includes('DataServiceVersion="1.0"')) return 'V2'; // Usually V2 compatible
        if (content.includes('edmx:Edmx Version="1.0"')) return 'V2'; // Default V2
        if (content.includes('edmx:Edmx Version="3.0"')) return 'V3'; 

        // Fallback checks
        if (content.includes('http://docs.oasis-open.org/odata/ns/edmx')) return 'V4';
        if (content.includes('http://schemas.microsoft.com/ado/2007/06/edmx')) return 'V2';

        return 'Unknown';
    } catch (e) {
        return 'Unknown';
    }
};

// 2. Probe Metadata URL
export const probeMetadataUrl = async (url: string): Promise<string> => {
    // 简单清理
    let cleanUrl = url.trim();
    
    // 如果已经是 metadata 结尾
    if (cleanUrl.toLowerCase().endsWith('$metadata')) {
        return cleanUrl;
    }

    // 尝试直接拼接
    const separator = cleanUrl.endsWith('/') ? '' : '/';
    const candidate = `${cleanUrl}${separator}$metadata`;
    
    // 简单验证（可选，这里直接返回预测值，让外部 fetch 去处理错误）
    return candidate;
};
