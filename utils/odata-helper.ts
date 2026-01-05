

export type ODataVersion = 'V2' | 'V3' | 'V4' | 'Unknown';

export interface EntityProperty {
  name: string;
  type: string;
  nullable: boolean;
  maxLength?: number;
  fixedLength?: boolean;
  precision?: number;
  scale?: number;
  unicode?: boolean;
  defaultValue?: string;
  concurrencyMode?: string;
  customAttributes?: Record<string, string>; // Capture custom namespace attributes (e.g. p6:StoreGeneratedPattern)
}

export interface EntityType {
  name: string;
  keys: string[];
  properties: EntityProperty[];
  navigationProperties: { 
    name: string; 
    targetType: string | null; 
    relationship?: string;
    sourceMultiplicity?: string; // e.g. "1", "0..1"
    targetMultiplicity?: string; // e.g. "*"
    constraints?: { sourceProperty: string; targetProperty: string }[]; // FK mappings
  }[];
}

export interface EntitySet {
    name: string;
    entityType: string;
}

export interface ParsedSchema {
    entities: EntityType[];
    complexTypes: EntityType[]; // Treat ComplexTypes structurally same as EntityType (minus keys)
    entitySets: EntitySet[];
    namespace: string;
}

interface AssociationEnd {
    role: string;
    type: string;
    multiplicity: string;
}

interface AssociationConstraint {
    principal: { role: string; propertyRef: string };
    dependent: { role: string; propertyRef: string };
}

// --- 核心：智能获取 Service Root ---
// 从任意 URL (e.g. .../Northwind.svc/Orders) 提取根路径 (.../Northwind.svc)
export const getServiceRoot = (url: string): string => {
    let cleanUrl = url.trim().split('#')[0].split('?')[0];
    
    // 1. 如果已经是 $metadata 结尾，去掉它
    if (cleanUrl.toLowerCase().endsWith('/$metadata')) {
        return cleanUrl.substring(0, cleanUrl.length - 10);
    }
    if (cleanUrl.toLowerCase().endsWith('$metadata')) {
        return cleanUrl.substring(0, cleanUrl.length - 9);
    }

    // 2. 检查 .svc (常见于 V2/V3/WCF Data Services)
    // 例子: .../Northwind.svc/Orders -> .../Northwind.svc
    const svcIndex = cleanUrl.toLowerCase().indexOf('.svc');
    if (svcIndex > -1) {
        return cleanUrl.substring(0, svcIndex + 4);
    }

    // 3. 检查 /odata/ (常见约定)
    // 例子: .../api/odata/Users -> .../api/odata
    const odataIndex = cleanUrl.toLowerCase().indexOf('/odata/');
    if (odataIndex > -1) {
        return cleanUrl.substring(0, odataIndex + 6); // include /odata
    }

    // 4. 默认回退：假设当前 URL 就是 Base (移除末尾斜杠)
    return cleanUrl.replace(/\/$/, '');
};

// 智能推断 Metadata URL (基于 getServiceRoot)
export const getMetadataUrl = (url: string): string => {
    const root = getServiceRoot(url);
    return `${root}/$metadata`;
};

// Helper: Parse OData Version from Metadata XML string
const parseVersionFromXml = (xml: string): ODataVersion => {
    if (xml.includes('Version="4.0"')) return 'V4';
    if (xml.includes('Version="1.0"') || xml.includes('Version="2.0"')) return 'V2';
    if (xml.includes('Version="3.0"')) return 'V3';
    return 'Unknown';
};

// 1. OData 检测与版本识别 (优化：支持传入文本直接判断，增强：支持检查原始 URL 响应)
export const detectODataVersion = async (urlOrXml: string, isXmlContent: boolean = false): Promise<ODataVersion> => {
  try {
    // 1. 直接解析 XML 内容 (通常用于 Dashboard 加载后)
    if (isXmlContent) {
        return parseVersionFromXml(urlOrXml);
    }

    const url = urlOrXml;
    
    // 2. 尝试推断并获取 Metadata (优先策略，因为 Metadata 最准确)
    try {
        const metadataUrl = getMetadataUrl(url);
        // 如果推断出的 metadataUrl 和原 URL 不同，尝试获取
        // 或者如果原 URL 本身就是 metadata
        const res = await fetch(metadataUrl, { method: 'GET' });
        if (res.ok) {
            const text = await res.text();
            // 简单的 XML 校验
            if (text.includes('<edmx:Edmx')) {
                const ver = parseVersionFromXml(text);
                if (ver !== 'Unknown') return ver;
            }
        }
    } catch (e) {
        console.warn("Metadata fetch failed, falling back to direct URL check", e);
    }

    // 3. 回退策略：检查原始 URL 的响应 (Response Body / Headers Check)
    // 适用于: 无法推断 Metadata URL，或者 Metadata 访问受限，但数据接口公开的情况
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json, application/xml, application/atom+xml'
            }
        });

        if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            const text = await res.text();

            // A. Check Headers
            const headerVer = res.headers.get('dataserviceversion') || res.headers.get('odata-version');
            if (headerVer) {
                if (headerVer.includes('4.0')) return 'V4';
                if (headerVer.includes('3.0')) return 'V3';
                if (headerVer.includes('2.0')) return 'V2';
            }

            // B. Check Body Signature (JSON)
            if (contentType.includes('json') || text.trim().startsWith('{')) {
                // V4 Signature
                if (text.includes('@odata.context') || text.includes('@odata.id')) return 'V4';
                // V2/V3 Signature
                if (text.includes('__metadata') || text.includes('"d"')) {
                    // Try to distinguish V3 via header or specific properties, otherwise fallback to V2
                    if (headerVer && headerVer.includes('3.0')) return 'V3';
                    return 'V2'; 
                }
            }

            // C. Check Body Signature (XML/Atom)
            if (contentType.includes('xml') || text.trim().startsWith('<')) {
                // V4 Namespace
                if (text.includes('http://docs.oasis-open.org/odata/ns/data')) return 'V4';
                // V2/V3 Namespace
                if (text.includes('http://schemas.microsoft.com/ado/2007/08/dataservices')) {
                    if (headerVer && headerVer.includes('3.0')) return 'V3';
                    return 'V2';
                }
            }
        }
    } catch (e) {
        console.warn("Direct URL check failed", e);
    }
    
    return 'Unknown';
  } catch (e) {
    console.error("Failed to detect OData version", e);
    return 'Unknown';
  }
};

// Helper: Parse Properties (Shared by EntityType and ComplexType)
const parseProperties = (element: Element): EntityProperty[] => {
    const properties: EntityProperty[] = [];
    const props = element.getElementsByTagName("Property");
    
    // List of standard OData Property attributes to exclude from customAttributes
    const STANDARD_ATTRS = new Set([
        'Name', 'Type', 'Nullable', 'MaxLength', 'FixedLength', 
        'Precision', 'Scale', 'Unicode', 'DefaultValue', 'ConcurrencyMode'
    ]);

    for (let p = 0; p < props.length; p++) {
        const propNode = props[p];
        const customAttributes: Record<string, string> = {};

        // Parse standard attributes
        const name = propNode.getAttribute("Name") || "";
        const type = propNode.getAttribute("Type") || "";
        const nullable = propNode.getAttribute("Nullable") !== "false";
        const maxLength = propNode.getAttribute("MaxLength") ? parseInt(propNode.getAttribute("MaxLength")!) : undefined;
        const fixedLength = propNode.getAttribute("FixedLength") === "true";
        const precision = propNode.getAttribute("Precision") ? parseInt(propNode.getAttribute("Precision")!) : undefined;
        const scale = propNode.getAttribute("Scale") ? parseInt(propNode.getAttribute("Scale")!) : undefined;
        const unicode = propNode.getAttribute("Unicode") !== "false";
        const defaultValue = propNode.getAttribute("DefaultValue") || undefined;
        const concurrencyMode = propNode.getAttribute("ConcurrencyMode") || undefined;

        // Parse custom attributes (e.g. p6:StoreGeneratedPattern)
        for (let i = 0; i < propNode.attributes.length; i++) {
            const attr = propNode.attributes[i];
            // Skip standard attributes and XML namespace declarations
            if (!STANDARD_ATTRS.has(attr.name) && !attr.name.startsWith('xmlns')) {
                customAttributes[attr.name] = attr.value;
            }
        }

        properties.push({
            name,
            type,
            nullable,
            maxLength,
            fixedLength,
            precision,
            scale,
            unicode,
            defaultValue,
            concurrencyMode,
            customAttributes: Object.keys(customAttributes).length > 0 ? customAttributes : undefined
        });
    }
    return properties;
};

// 2. 解析 Metadata
export const parseMetadataToSchema = (xmlText: string): ParsedSchema => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const schemas = doc.getElementsByTagName("Schema"); 
  
  if (!schemas || schemas.length === 0) return { entities: [], complexTypes: [], entitySets: [], namespace: '' };

  const schema = schemas[0];
  const namespace = schema.getAttribute("Namespace") || "";

  // 存储 Association 详情
  const associationMap: Record<string, { 
      roles: Record<string, AssociationEnd>,
      constraint?: AssociationConstraint 
  }> = {};
  
  const assocTypes = schema.getElementsByTagName("Association");
  for (let i = 0; i < assocTypes.length; i++) {
    const at = assocTypes[i];
    const name = at.getAttribute("Name");
    if (!name) continue;

    const fullName = namespace ? `${namespace}.${name}` : name;
    
    const roles: Record<string, AssociationEnd> = {};
    const ends = at.getElementsByTagName("End");
    for (let j = 0; j < ends.length; j++) {
        const role = ends[j].getAttribute("Role");
        const type = ends[j].getAttribute("Type") || "";
        const multiplicity = ends[j].getAttribute("Multiplicity") || "1";
        if (role) roles[role] = { role, type, multiplicity };
    }

    let constraint: AssociationConstraint | undefined;
    const refConst = at.getElementsByTagName("ReferentialConstraint")[0];
    if (refConst) {
        const principal = refConst.getElementsByTagName("Principal")[0];
        const dependent = refConst.getElementsByTagName("Dependent")[0];
        if (principal && dependent) {
            const pRole = principal.getAttribute("Role");
            const pRef = principal.getElementsByTagName("PropertyRef")[0]?.getAttribute("Name");
            const dRole = dependent.getAttribute("Role");
            const dRef = dependent.getElementsByTagName("PropertyRef")[0]?.getAttribute("Name");
            
            if (pRole && pRef && dRole && dRef) {
                constraint = {
                    principal: { role: pRole, propertyRef: pRef },
                    dependent: { role: dRole, propertyRef: dRef }
                };
            }
        }
    }

    const assocData = { roles, constraint };
    associationMap[fullName] = assocData;
    associationMap[name] = assocData; 
  }

  // 解析 EntitySets
  const entitySets: EntitySet[] = [];
  const entityContainers = doc.getElementsByTagName("EntityContainer");
  for (let i = 0; i < entityContainers.length; i++) {
      const sets = entityContainers[i].getElementsByTagName("EntitySet");
      for (let j = 0; j < sets.length; j++) {
          const name = sets[j].getAttribute("Name");
          const type = sets[j].getAttribute("EntityType");
          if (name && type) {
              entitySets.push({ name, entityType: type });
          }
      }
  }

  // 解析 ComplexTypes (新增)
  const complexTypes: EntityType[] = [];
  const complexTypeNodes = schema.getElementsByTagName("ComplexType");
  for (let i = 0; i < complexTypeNodes.length; i++) {
      const ct = complexTypeNodes[i];
      const name = ct.getAttribute("Name") || "Unknown";
      const properties = parseProperties(ct);
      // Complex Types typically don't have keys or navigation properties (in V2/V3), but V4 allows nav props.
      // Keeping structure compatible with EntityType for simpler handling.
      complexTypes.push({ name, keys: [], properties, navigationProperties: [] });
  }

  // 解析 EntityTypes
  const entities: EntityType[] = [];
  const entityTypes = schema.getElementsByTagName("EntityType");

  for (let i = 0; i < entityTypes.length; i++) {
    const et = entityTypes[i];
    const name = et.getAttribute("Name") || "Unknown";
    
    const keys: string[] = [];
    const keyNode = et.getElementsByTagName("Key")[0];
    if (keyNode) {
        const propRefs = keyNode.getElementsByTagName("PropertyRef");
        for (let k = 0; k < propRefs.length; k++) keys.push(propRefs[k].getAttribute("Name") || "");
    }

    const properties = parseProperties(et);

    const navProps: EntityType['navigationProperties'] = [];
    const navs = et.getElementsByTagName("NavigationProperty");
    
    for (let n = 0; n < navs.length; n++) {
        const navName = navs[n].getAttribute("Name") || "Unknown";
        const v4Type = navs[n].getAttribute("Type"); 
        const relationship = navs[n].getAttribute("Relationship");
        const toRole = navs[n].getAttribute("ToRole"); 
        const fromRole = navs[n].getAttribute("FromRole");

        let targetType: string | null = null;
        let sourceMult = "";
        let targetMult = "";
        let constraints: { sourceProperty: string; targetProperty: string }[] = [];

        if (v4Type) {
            // V4 Logic
            if (v4Type.startsWith("Collection(")) {
                targetType = v4Type.slice(11, -1);
                targetMult = "*";
            } else {
                targetType = v4Type;
                targetMult = "1";
            }
            const v4Ref = navs[n].getElementsByTagName("ReferentialConstraint");
            for(let r=0; r<v4Ref.length; r++) {
                const prop = v4Ref[r].getAttribute("Property");
                const refProp = v4Ref[r].getAttribute("ReferencedProperty");
                if(prop && refProp) constraints.push({ sourceProperty: prop, targetProperty: refProp });
            }
        } else if (relationship && toRole && fromRole) {
            // V2/V3 Logic
            const assocData = associationMap[relationship] || associationMap[relationship.split('.').pop() || ''];
            if (assocData) {
                const toEnd = assocData.roles[toRole];
                const fromEnd = assocData.roles[fromRole];
                
                if (toEnd) {
                    targetType = toEnd.type;
                    targetMult = toEnd.multiplicity;
                }
                if (fromEnd) {
                    sourceMult = fromEnd.multiplicity;
                }

                if (assocData.constraint) {
                    const c = assocData.constraint;
                    if (c.principal.role === fromRole && c.dependent.role === toRole) {
                         constraints.push({ sourceProperty: c.principal.propertyRef, targetProperty: c.dependent.propertyRef });
                    } else if (c.dependent.role === fromRole && c.principal.role === toRole) {
                         constraints.push({ sourceProperty: c.dependent.propertyRef, targetProperty: c.principal.propertyRef });
                    }
                }
            }
        }

        navProps.push({
            name: navName,
            targetType, 
            relationship: relationship || undefined,
            sourceMultiplicity: sourceMult,
            targetMultiplicity: targetMult,
            constraints
        });
    }

    entities.push({ name, keys, properties, navigationProperties: navProps });
  }

  return { entities, complexTypes, entitySets, namespace };
};

// ... (Rest of the file remains unchanged: Code generators)
// SAPUI5 Code Generator, C# Code Generator, Java Code Generator...
export const generateSAPUI5Code = (op: 'read'|'delete'|'create'|'update', es: string, p: any, v: ODataVersion) => {
    let code = `// SAPUI5 OData ${v} Code for ${op} on ${es}\n`;
    code += `var oModel = this.getView().getModel();\n`;
    
    if (op === 'read') {
        const filters = p.filters?.map((f: any) => `new Filter("${f.field}", FilterOperator.${f.operator}, "${f.value}")`).join(', ');
        const urlParams: any = {};
        if (p.expand) urlParams.$expand = p.expand;
        if (p.select) urlParams.$select = p.select;
        if (p.orderby) urlParams.$orderby = p.orderby;
        if (p.top) urlParams.$top = p.top;
        if (p.skip) urlParams.$skip = p.skip;
        if (p.inlinecount) urlParams.$inlinecount = 'allpages';
        
        code += `oModel.read("/${es}", {\n`;
        if (filters) code += `  filters: [${filters}],\n`;
        if (Object.keys(urlParams).length > 0) code += `  urlParameters: ${JSON.stringify(urlParams, null, 2)},\n`;
        code += `  success: function(oData, response) { console.log(oData); },\n`;
        code += `  error: function(oError) { console.error(oError); }\n`;
        code += `});`;
    } else if (op === 'delete') {
         code += `// Delete ${p.keyPredicates?.length || 1} items\n`;
         code += `var mParameters = {\n`;
         code += `    success: function() { console.log("Delete success"); },\n`;
         code += `    error: function(oError) { console.error("Delete failed", oError); }\n`;
         code += `};\n\n`;
         
         const predicates = p.keyPredicates || [p.key];
         predicates.forEach((pred: string) => {
             code += `oModel.remove("/${es}${pred}", mParameters);\n`;
         });
    } else if (op === 'create') {
        code += `// Create ${p.dataArray?.length || 1} items\n`;
        code += `var mParameters = {\n`;
        code += `    success: function(oData, response) { console.log("Create success"); },\n`;
        code += `    error: function(oError) { console.error("Create failed", oError); }\n`;
        code += `};\n\n`;
        
        // Support bulk creation loop
        const dataItems = p.dataArray || [p.data];
        dataItems.forEach((item: any) => {
            code += `var oData = ${JSON.stringify(item, null, 2)};\n`;
            code += `oModel.create("/${es}", oData, mParameters);\n`;
        });
    } else if (op === 'update') {
        // p.updates is array of { predicate: string, changes: object }
        code += `// Update (PATCH) ${p.updates?.length || 1} items\n`;
        code += `var mParameters = {\n`;
        code += `    success: function() { console.log("Update success"); },\n`;
        code += `    error: function(oError) { console.error("Update failed", oError); }\n`;
        code += `};\n\n`;

        p.updates?.forEach((upd: any) => {
             code += `var oData = ${JSON.stringify(upd.changes)};\n`;
             code += `oModel.update("/${es}${upd.predicate}", oData, mParameters);\n`;
        });
    }

    return code; 
};

// 4. C# Code Generator
export const generateCSharpDeleteCode = (entitySet: string, keyPredicates: string[], baseUrl: string, version: ODataVersion) => {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    let sb = `// C# HttpClient Example for deleting from ${entitySet} (${version})\n`;
    sb += `using System;\nusing System.Net.Http;\nusing System.Threading.Tasks;\n\n`;
    sb += `public async Task DeleteItemsAsync()\n{\n`;
    sb += `    using (var client = new HttpClient())\n    {\n`;
    sb += `        client.BaseAddress = new Uri("${cleanUrl}/");\n`;
    
    if (version === 'V4') {
        sb += `        client.DefaultRequestHeaders.Add("OData-Version", "4.0");\n`;
        sb += `        client.DefaultRequestHeaders.Add("OData-MaxVersion", "4.0");\n`;
    } else {
        sb += `        client.DefaultRequestHeaders.Add("DataServiceVersion", "2.0");\n`;
        sb += `        client.DefaultRequestHeaders.Add("MaxDataServiceVersion", "2.0");\n`;
    }
    sb += `\n`;
    
    keyPredicates.forEach(pred => {
        sb += `        // DELETE ${entitySet}${pred}\n`;
        sb += `        var response = await client.DeleteAsync("${entitySet}${pred}");\n`;
        sb += `        response.EnsureSuccessStatusCode();\n`;
    });
    
    sb += `    }\n}`;
    return sb;
};

export const generateCSharpUpdateCode = (entitySet: string, updates: { predicate: string, changes: any }[], baseUrl: string, version: ODataVersion) => {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    let sb = `// C# HttpClient Example for Updating (PATCH) ${entitySet} (${version})\n`;
    sb += `using System;\nusing System.Net.Http;\nusing System.Text;\nusing System.Threading.Tasks;\nusing Newtonsoft.Json;\n\n`;
    sb += `public async Task UpdateItemsAsync()\n{\n`;
    sb += `    using (var client = new HttpClient())\n    {\n`;
    sb += `        client.BaseAddress = new Uri("${cleanUrl}/");\n`;
    
    if (version === 'V4') {
        sb += `        client.DefaultRequestHeaders.Add("OData-Version", "4.0");\n`;
    } else {
        sb += `        client.DefaultRequestHeaders.Add("DataServiceVersion", "2.0");\n`;
    }
    sb += `\n`;
    
    updates.forEach(upd => {
        sb += `        // PATCH ${entitySet}${upd.predicate}\n`;
        sb += `        var json = JsonConvert.SerializeObject(new ${JSON.stringify(upd.changes).replace(/"/g, '\"')});\n`;
        sb += `        var content = new StringContent(json, Encoding.UTF8, "application/json");\n`;
        sb += `        // Note: Use PatchAsync extension or proper HTTP method construction\n`;
        sb += `        var request = new HttpRequestMessage(new HttpMethod("PATCH"), "${entitySet}${upd.predicate}") { Content = content };\n`;
        sb += `        var response = await client.SendAsync(request);\n`;
        sb += `        response.EnsureSuccessStatusCode();\n\n`;
    });
    
    sb += `    }\n}`;
    return sb;
};

export const generateCSharpCreateCode = (entitySet: string, items: any[], baseUrl: string, version: ODataVersion) => {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    let sb = `// C# HttpClient Example for Creating items in ${entitySet} (${version})\n`;
    sb += `using System;\nusing System.Net.Http;\nusing System.Text;\nusing System.Threading.Tasks;\nusing Newtonsoft.Json;\n\n`;
    sb += `public async Task CreateItemsAsync()\n{\n`;
    sb += `    using (var client = new HttpClient())\n    {\n`;
    sb += `        client.BaseAddress = new Uri("${cleanUrl}/");\n`;
    
    if (version === 'V4') {
        sb += `        client.DefaultRequestHeaders.Add("OData-Version", "4.0");\n`;
    } else {
        sb += `        client.DefaultRequestHeaders.Add("DataServiceVersion", "2.0");\n`;
    }
    sb += `\n`;
    
    items.forEach((item, idx) => {
        sb += `        // POST (Create) Item ${idx + 1}\n`;
        sb += `        var json = JsonConvert.SerializeObject(new ${JSON.stringify(item).replace(/"/g, '\"')});\n`;
        sb += `        var content = new StringContent(json, Encoding.UTF8, "application/json");\n`;
        sb += `        var response = await client.PostAsync("${entitySet}", content);\n`;
        sb += `        response.EnsureSuccessStatusCode();\n\n`;
    });
    
    sb += `    }\n}`;
    return sb;
};

// 5. Java Olingo Code Generator
export const generateJavaDeleteCode = (entitySet: string, keyPredicates: string[], version: ODataVersion, baseUrl: string) => {
    let sb = '';
    let clientMethod = version === 'V4' ? 'getClient()' : 'getV3()';

    sb += `// Java Olingo Client Example (Delete)\n`;
    sb += `import org.apache.olingo.client.api.ODataClient;\n`;
    sb += `import org.apache.olingo.client.core.ODataClientFactory;\n`;
    sb += `import org.apache.olingo.client.api.communication.request.cud.ODataDeleteRequest;\n`;
    sb += `import java.net.URI;\n\n`;
    
    sb += `public void deleteItems() {\n`;
    sb += `    String serviceRoot = "${baseUrl}";\n`;
    sb += `    ODataClient client = ODataClientFactory.${clientMethod};\n\n`;
    
    keyPredicates.forEach(pred => {
        const keyVal = pred.replace(/^\(/, '').replace(/\)$/, '');
        sb += `    URI uri = client.newURIBuilder(serviceRoot).appendEntitySetSegment("${entitySet}").appendKeySegment(${keyVal}).build();\n`;
        sb += `    ODataDeleteRequest request = client.getCUDRequestFactory().getDeleteRequest(uri);\n`;
        sb += `    client.getCUDRequestFactory().getDeleteRequest(uri).execute();\n`;
    });
    sb += `}\n`;
    return sb;
};

export const generateJavaUpdateCode = (entitySet: string, updates: { predicate: string, changes: any }[], version: ODataVersion, baseUrl: string) => {
    let sb = '';
    let clientMethod = version === 'V4' ? 'getClient()' : 'getV3()';

    sb += `// Java Olingo Client Example (Update/Patch)\n`;
    sb += `import org.apache.olingo.client.api.ODataClient;\n`;
    sb += `import org.apache.olingo.client.core.ODataClientFactory;\n`;
    sb += `import org.apache.olingo.client.api.domain.ClientEntity;\n`;
    sb += `import org.apache.olingo.client.api.communication.request.cud.ODataEntityUpdateRequest;\n`;
    sb += `import org.apache.olingo.commons.api.format.ContentType;\n`;
    sb += `import org.apache.olingo.client.api.communication.request.cud.UpdateType;\n`;
    sb += `import java.net.URI;\n\n`;
    
    sb += `public void updateItems() {\n`;
    sb += `    String serviceRoot = "${baseUrl}";\n`;
    sb += `    ODataClient client = ODataClientFactory.${clientMethod};\n\n`;
    
    updates.forEach(upd => {
        const keyVal = upd.predicate.replace(/^\(/, '').replace(/\)$/, '');
        sb += `    // Update for key: ${upd.predicate}\n`;
        sb += `    ClientEntity entity = client.getObjectFactory().newEntity(null);\n`;
        Object.entries(upd.changes).forEach(([k, v]) => {
             const valStr = typeof v === 'string' ? `"${v}"` : v;
             sb += `    entity.getProperties().add(client.getObjectFactory().newPrimitiveProperty("${k}", client.getObjectFactory().newPrimitiveValueBuilder().build(${valStr})));\n`;
        });
        
        sb += `    URI uri = client.newURIBuilder(serviceRoot).appendEntitySetSegment("${entitySet}").appendKeySegment(${keyVal}).build();\n`;
        sb += `    ODataEntityUpdateRequest<ClientEntity> request = client.getCUDRequestFactory().getEntityUpdateRequest(uri, UpdateType.PATCH, entity);\n`;
        sb += `    request.execute();\n\n`;
    });
    sb += `}\n`;
    return sb;
};

export const generateJavaCreateCode = (entitySet: string, items: any[], version: ODataVersion, baseUrl: string) => {
    let sb = '';
    let clientMethod = version === 'V4' ? 'getClient()' : 'getV3()';

    sb += `// Java Olingo Client Example (Create)\n`;
    sb += `import org.apache.olingo.client.api.ODataClient;\n`;
    sb += `import org.apache.olingo.client.core.ODataClientFactory;\n`;
    sb += `import org.apache.olingo.client.api.domain.ClientEntity;\n`;
    sb += `import org.apache.olingo.client.api.communication.request.cud.ODataEntityCreateRequest;\n`;
    sb += `import java.net.URI;\n\n`;
    
    sb += `public void createItems() {\n`;
    sb += `    String serviceRoot = "${baseUrl}";\n`;
    sb += `    ODataClient client = ODataClientFactory.${clientMethod};\n    URI uri = client.newURIBuilder(serviceRoot).appendEntitySetSegment("${entitySet}").build();\n\n`;
    
    items.forEach((item, idx) => {
        sb += `    // Create Item ${idx + 1}\n`;
        sb += `    ClientEntity entity = client.getObjectFactory().newEntity("${entitySet}");\n`;
        Object.entries(item).forEach(([k, v]) => {
             const valStr = typeof v === 'string' ? `"${v}"` : v;
             sb += `    entity.getProperties().add(client.getObjectFactory().newPrimitiveProperty("${k}", client.getObjectFactory().newPrimitiveValueBuilder().build(${valStr})));\n`;
        });
        
        sb += `    ODataEntityCreateRequest<ClientEntity> request = client.getCUDRequestFactory().getEntityCreateRequest(uri, entity);\n`;
        sb += `    request.execute();\n\n`;
    });
    sb += `}\n`;
    return sb;
};
