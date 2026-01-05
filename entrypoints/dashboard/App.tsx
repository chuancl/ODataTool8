
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { NextUIProvider } from "@nextui-org/system";
import { Tabs, Tab } from "@nextui-org/tabs";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import { Chip } from "@nextui-org/chip";
import { detectODataVersion, parseMetadataToSchema, ODataVersion, ParsedSchema } from '@/utils/odata-helper';
import ODataERDiagram from '@/components/ODataERDiagram';
import QueryBuilder from '@/components/QueryBuilder';
import MockDataGenerator from '@/components/MockDataGenerator';
import { UsageGuide } from '@/components/UsageGuide';
import { Moon, Sun, Search, RotateCw, BookOpen, Database, SearchCode, Braces } from 'lucide-react';
import { ToastProvider, useToast } from '@/components/ui/ToastContext';
import { storage } from 'wxt/storage';
// 使用相对路径引入样式
import '../../assets/main.css';

// 内部组件，以便使用 useToast
const DashboardContent: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const [url, setUrl] = useState('');
  const [odataVersion, setOdataVersion] = useState<ODataVersion>('Unknown');
  const [isValidating, setIsValidating] = useState(false);
  const [schema, setSchema] = useState<ParsedSchema | null>(null);
  const [rawMetadataXml, setRawMetadataXml] = useState<string>('');
  
  // 增加 Tab 状态控制，默认显示 ER 图 (er)，但用户可以随时切换到 guide
  const [activeTab, setActiveTab] = useState<string>('er');
  
  const toast = useToast();

  useEffect(() => {
    const init = async () => {
        const hash = window.location.hash;
        
        // 1. 检查是否是上传模式
        if (hash.includes('source=upload')) {
            setUrl('Local File (Uploaded)');
            setIsValidating(true);
            try {
                const uploadedXml = await storage.getItem<string>('local:uploadedMetadata');
                if (uploadedXml) {
                    processXmlContent(uploadedXml, 'Uploaded File');
                } else {
                    toast.error("未找到上传的文件内容 (No uploaded file content found)");
                }
            } catch (e) {
                console.error(e);
                toast.error("读取本地存储失败 (Failed to read local storage)");
            } finally {
                setIsValidating(false);
            }
        } 
        // 2. 检查是否是 URL 模式
        else if (hash.includes('url=')) {
            const targetUrl = decodeURIComponent(hash.split('url=')[1]);
            setUrl(targetUrl);
            validateAndLoad(targetUrl);
        }
    };
    init();
  }, []);

  // Sync Dark Mode to HTML root for Portals/Popovers support
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // 处理 XML 内容的通用逻辑
  const processXmlContent = async (xmlText: string, sourceName: string) => {
      setRawMetadataXml(xmlText);
      setSchema(null); // Reset before parse

      try {
          // 统一检测版本
          const ver = await detectODataVersion(xmlText, true);
          setOdataVersion(ver);

          if (ver === 'Unknown') {
              toast.warning("无法识别 OData 版本，可能不是标准的 OData XML。\n(OData version not detected)");
          } else {
              toast.success(`成功加载 OData ${ver} (${sourceName})！`);
          }

          // 统一解析 Schema
          const parsedSchema = parseMetadataToSchema(xmlText);
          setSchema(parsedSchema);
      } catch (e: any) {
          console.error("Parse failed:", e);
          setOdataVersion('Unknown');
          setSchema(null);
          toast.error(`解析 XML 失败 (Failed to parse XML):\n${e.message || e}`);
      }
  };

  const validateAndLoad = async (targetUrl: string) => {
    if (!targetUrl) {
        toast.warning("请输入有效的 URL (Please enter a valid URL)");
        return;
    }
    setIsValidating(true);
    
    try {
        // 1. 统一获取 Metadata XML
        const metadataUrl = targetUrl.endsWith('$metadata') ? targetUrl : `${targetUrl.replace(/\/$/, '')}/$metadata`;
        const res = await fetch(metadataUrl);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
        
        const xmlText = await res.text();
        await processXmlContent(xmlText, 'Network URL');

    } catch (e: any) {
        console.error("Failed to load OData service:", e);
        setOdataVersion('Unknown');
        setSchema(null);
        setRawMetadataXml('');
        toast.error(`加载服务失败 (Failed to load service):\n${e.message || e}`);
    } finally {
        setIsValidating(false);
    }
  };

  const handleUrlChange = (val: string) => setUrl(val);

  return (
      <div className="text-foreground bg-background h-screen w-screen flex flex-col overflow-hidden font-sans antialiased">
        
        {/* 顶部导航栏 */}
        <nav className="h-16 border-b border-divider px-6 flex items-center justify-between bg-content1 shrink-0 z-50 shadow-sm gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
              OData Master
            </span>
            <Chip color={odataVersion === 'Unknown' ? 'default' : 'success'} variant="flat" size="sm">
              {odataVersion}
            </Chip>
          </div>
          
          <div className="flex items-center gap-2 flex-1 max-w-4xl mx-auto">
            <Input 
              placeholder="Enter OData Service URL (e.g. https://services.odata.org/Northwind/Northwind.svc/)" 
              value={url}
              onValueChange={handleUrlChange}
              size="sm"
              variant="bordered"
              isClearable
              onClear={() => setUrl('')}
              startContent={<Search className="text-default-400" size={16} />}
              className="flex-1"
              classNames={{
                inputWrapper: "bg-content2 hover:bg-content3 transition-colors group-data-[focus=true]:bg-content2"
              }}
            />
            <Button 
              size="sm" 
              color="primary" 
              isLoading={isValidating} 
              onPress={() => validateAndLoad(url)}
              className="font-medium shrink-0"
              startContent={!isValidating && <RotateCw size={16} />}
            >
              Parse
            </Button>
          </div>

          <Button isIconOnly variant="light" onPress={() => setIsDark(!isDark)} className="text-default-500 shrink-0">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
        </nav>

        {/* 主内容区域 */}
        <main className="flex-1 w-full h-full relative overflow-hidden bg-content2/50 p-2 md:p-4">
          {!schema && !isValidating ? (
            <div className="flex flex-col items-center justify-center h-full text-default-400 gap-4">
              <div className="w-20 h-20 bg-content3 rounded-full flex items-center justify-center mb-2 shadow-inner">
                <Search size={32} className="opacity-50" />
              </div>
              <h2 className="text-xl font-semibold text-default-600">No OData Service Loaded</h2>
              <p className="max-w-md text-center text-sm opacity-70">
                输入 URL 并点击 "Parse" 或通过插件弹窗上传文件。
                <br/>
                Enter a valid OData Service URL or upload a metadata file via the popup.
              </p>
            </div>
          ) : (
            <div className="h-full w-full flex flex-col bg-content1 rounded-xl shadow-sm border border-divider overflow-hidden">
               {/* 
                  Keep-Alive Strategy:
                  1. Tabs use onSelectionChange but render NO content directly (empty Tabs).
                  2. Content divs are rendered below, controlled by style={{ display }}
               */}
               <Tabs 
                aria-label="Features" 
                color="primary" 
                variant="underlined"
                selectedKey={activeTab}
                onSelectionChange={(k) => setActiveTab(k as string)}
                classNames={{
                  base: "w-full border-b border-divider shrink-0",
                  tabList: "p-0 gap-6 px-4 relative", 
                  cursor: "w-full bg-primary",
                  tab: "max-w-fit px-2 h-12 data-[selected=true]:font-bold",
                  panel: "hidden" // Hide default panel behavior completely
                }}
              >
                {/* 新增: 使用指南页签 (最左侧) */}
                <Tab key="guide" title={<div className="flex items-center gap-2"><BookOpen size={16}/><span>Guide</span></div>} />
                <Tab key="er" title={<div className="flex items-center gap-2"><Database size={16}/><span>ER Diagram</span></div>} />
                <Tab key="query" title={<div className="flex items-center gap-2"><SearchCode size={16}/><span>Query Builder</span></div>} />
                <Tab key="mock" title={<div className="flex items-center gap-2"><Braces size={16}/><span>Mock Data</span></div>} />
              </Tabs>

              {/* Content Container */}
              <div className="flex-1 w-full h-full p-0 overflow-hidden relative bg-content1">
                  
                  {/* Usage Guide View (New) */}
                  <div className="w-full h-full absolute inset-0 bg-content1" style={{ display: activeTab === 'guide' ? 'block' : 'none', visibility: activeTab === 'guide' ? 'visible' : 'hidden' }}>
                      <UsageGuide isDark={isDark} />
                  </div>

                  {/* ER Diagram View */}
                  <div className="w-full h-full absolute inset-0" style={{ display: activeTab === 'er' ? 'block' : 'none', visibility: activeTab === 'er' ? 'visible' : 'hidden' }}>
                     <ODataERDiagram url={url} schema={schema} isLoading={isValidating} xmlContent={rawMetadataXml} isDark={isDark} />
                  </div>

                  {/* Query Builder View */}
                  <div className="w-full h-full absolute inset-0" style={{ display: activeTab === 'query' ? 'block' : 'none', visibility: activeTab === 'query' ? 'visible' : 'hidden' }}>
                    <div className="h-full w-full p-0">
                        {/* 如果是本地文件上传模式，某些在线查询功能可能不可用 */}
                        <QueryBuilder url={url.startsWith('Local') ? '' : url} version={odataVersion} isDark={isDark} schema={schema} />
                    </div>
                  </div>

                  {/* Mock Data View */}
                  <div className="w-full h-full absolute inset-0" style={{ display: activeTab === 'mock' ? 'block' : 'none', visibility: activeTab === 'mock' ? 'visible' : 'hidden' }}>
                    <div className="h-full w-full p-4 overflow-y-auto">
                        <MockDataGenerator url={url.startsWith('Local') ? '' : url} version={odataVersion} schema={schema} isDark={isDark} />
                    </div>
                  </div>
              </div>
            </div>
          )}
        </main>
      </div>
  );
};

const App: React.FC = () => {
    return (
        <NextUIProvider>
            <ToastProvider>
                <DashboardContent />
            </ToastProvider>
        </NextUIProvider>
    )
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
