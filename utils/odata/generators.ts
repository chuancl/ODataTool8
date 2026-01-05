
import { ODataVersion } from './types';

// --- Code Generators ---

export const generateSAPUI5Code = (
    action: 'delete' | 'update' | 'create', 
    entitySet: string, 
    data: { keyPredicates?: string[], updates?: any[], dataArray?: any[] },
    version: ODataVersion
): string => {
    const model = version === 'V4' ? 'sap.ui.model.odata.v4.ODataModel' : 'sap.ui.model.odata.v2.ODataModel';
    
    if (action === 'delete') {
        const preds = data.keyPredicates || [];
        return `// SAPUI5 ${version} Delete Example
var oModel = this.getView().getModel(); // ${model}

${preds.map(pred => `
oModel.remove("/${entitySet}${pred}", {
    success: function() {
        console.log("Deleted: ${pred}");
    },
    error: function(oError) {
        console.error("Delete failed: ${pred}", oError);
    }
});`).join('\n')}
`;
    }

    if (action === 'update') {
        const updates = data.updates || [];
        return `// SAPUI5 ${version} Update Example
var oModel = this.getView().getModel();

${updates.map(u => `
var oPayload = ${JSON.stringify(u.changes, null, 4)};
oModel.update("/${entitySet}${u.predicate}", oPayload, {
    success: function() { console.log("Updated"); },
    error: function(oError) { console.error(oError); }
});`).join('\n')}
`;
    }

    if (action === 'create') {
        const items = data.dataArray || [];
        return `// SAPUI5 ${version} Create Example
var oModel = this.getView().getModel();

${items.map(item => `
var oPayload = ${JSON.stringify(item, null, 4)};
oModel.create("/${entitySet}", oPayload, {
    success: function(oData) { console.log("Created", oData); },
    error: function(oError) { console.error(oError); }
});`).join('\n')}
`;
    }

    return '// Unknown action';
};

export const generateCSharpDeleteCode = (entitySet: string, keys: string[], baseUrl: string, version: ODataVersion) => {
    return `// C# HttpClient Delete Example
using System.Net.Http;

var client = new HttpClient();
client.BaseAddress = new Uri("${baseUrl}");

${keys.map(key => `
var response = await client.DeleteAsync("${entitySet}${key}");
if (response.IsSuccessStatusCode) {
    Console.WriteLine("Deleted ${key}");
}
`).join('\n')}
`;
};

export const generateJavaDeleteCode = (entitySet: string, keys: string[], version: ODataVersion, baseUrl: string) => {
    return `// Java (Apache Olingo / Generic) Delete Example
String baseUrl = "${baseUrl}";

${keys.map(key => `
HttpDelete deleteRequest = new HttpDelete(baseUrl + "${entitySet}${key}");
HttpResponse response = httpClient.execute(deleteRequest);
`).join('\n')}
`;
};

export const generateCSharpUpdateCode = (entitySet: string, updates: any[], baseUrl: string, version: ODataVersion) => {
    return `// C# Update (PATCH)
using System.Net.Http;
using System.Text;

var client = new HttpClient();

${updates.map(u => `
var json = @"${JSON.stringify(u.changes).replace(/"/g, '""')}";
var content = new StringContent(json, Encoding.UTF8, "application/json");
// PATCH or MERGE depending on OData version
var method = new HttpMethod("PATCH"); 
var request = new HttpRequestMessage(method, "${baseUrl}${entitySet}${u.predicate}") { Content = content };
var response = await client.SendAsync(request);
`).join('\n')}
`;
};

export const generateJavaUpdateCode = (entitySet: string, updates: any[], version: ODataVersion, baseUrl: string) => {
    return `// Java Update
${updates.map(u => `
String url = "${baseUrl}${entitySet}${u.predicate}";
HttpPatch request = new HttpPatch(url);
String json = "${JSON.stringify(u.changes).replace(/"/g, '\\"')}";
request.setEntity(new StringEntity(json, ContentType.APPLICATION_JSON));
httpClient.execute(request);
`).join('\n')}
`;
};

export const generateCSharpCreateCode = (entitySet: string, items: any[], baseUrl: string, version: ODataVersion) => {
    return `// C# Create (POST)
using System.Net.Http;
using System.Text;

var client = new HttpClient();

${items.map(item => `
var json = @"${JSON.stringify(item).replace(/"/g, '""')}";
var content = new StringContent(json, Encoding.UTF8, "application/json");
var response = await client.PostAsync("${baseUrl}${entitySet}", content);
`).join('\n')}
`;
};

export const generateJavaCreateCode = (entitySet: string, items: any[], version: ODataVersion, baseUrl: string) => {
    return `// Java Create
${items.map(item => `
HttpPost request = new HttpPost("${baseUrl}${entitySet}");
String json = "${JSON.stringify(item).replace(/"/g, '\\"')}";
request.setEntity(new StringEntity(json, ContentType.APPLICATION_JSON));
httpClient.execute(request);
`).join('\n')}
`;
};
