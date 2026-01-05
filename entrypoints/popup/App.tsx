
import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { NextUIProvider } from "@nextui-org/system";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Divider } from "@nextui-org/divider";
import { getSettings, AppSettings } from '@/utils/storage';
import { Settings, ExternalLink, Globe, Upload } from 'lucide-react';
import { browser } from 'wxt/browser';
import { storage } from 'wxt/storage';
import { ToastProvider, useToast } from '@/components/ui/ToastContext';
import '../../assets/main.css';

// 内部组件使用 Toast
const PopupContent: React.FC = () => {
  const [manualInput, setManualInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // 尝试获取当前 Tab URL 填充输入框
  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const currentUrl = tabs[0]?.url;
      if (currentUrl && (currentUrl.includes('.svc') || currentUrl.includes('/odata/') || currentUrl.includes('$metadata'))) {
        setManualInput(currentUrl);
      }
    });
  }, []);

  const openDashboard = (url?: string) => {
    const targetUrl = url || manualInput;
    const pagePath = 'dashboard.html';
    
    if (targetUrl) {
      const dashboardUrl = (browser.runtime as any).getURL(`${pagePath}#url=${encodeURIComponent(targetUrl)}`);
      browser.tabs.create({ url: dashboardUrl });
    } else {
      const dashboardUrl = (browser.runtime as any).getURL(pagePath);
      browser.tabs.create({ url: dashboardUrl });
    }
  };

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        // 将文件内容保存到 storage，以便 dashboard 读取
        await storage.setItem('local:uploadedMetadata', text);
        
        // 打开 Dashboard，标记 source 为 upload
        const pagePath = 'dashboard.html';
        const dashboardUrl = (browser.runtime as any).getURL(`${pagePath}#source=upload`);
        browser.tabs.create({ url: dashboardUrl });
        
        toast.success("文件读取成功，正在打开分析页...");
    } catch (err) {
        console.error(err);
        toast.error("读取文件失败");
    } finally {
        // 重置 input 以便允许再次上传同名文件
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  return (
      <div className="w-[360px] bg-background text-foreground flex flex-col h-fit max-h-[600px] border border-divider">
        {/* Header */}
        <header className="px-4 py-3 border-b border-divider flex items-center justify-between bg-content1">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h1 className="text-base font-bold">OData Master</h1>
          </div>
          <div className="text-[10px] text-default-400 bg-default-100 px-2 py-0.5 rounded">
            DevTools
          </div>
        </header>

        <div className="p-4 flex flex-col gap-4">
          {/* Main Action: URL Input */}
          <section>
            <Input 
              label="OData Service URL" 
              placeholder="https://.../Service.svc" 
              size="sm" 
              variant="bordered"
              value={manualInput} 
              onValueChange={setManualInput}
              className="mb-3"
              description="输入 URL 或点击按钮自动加载当前页"
            />
            <Button 
              color="primary" 
              fullWidth 
              endContent={<ExternalLink size={16}/>} 
              onPress={() => openDashboard()}
              className="font-medium shadow-md shadow-primary/20"
            >
              分析并可视化 (Analyze & Visualize)
            </Button>
          </section>

          <Divider className="my-1"/>

          {/* File Upload Section */}
          <section className="flex flex-col gap-2">
              <div className="text-xs text-default-500 font-medium px-1">本地文件 (Local File)</div>
              <input 
                  type="file" 
                  accept=".xml,.edmx,.txt" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
              />
              <Button 
                  color="secondary" 
                  variant="flat"
                  fullWidth 
                  startContent={<Upload size={16}/>} 
                  onPress={() => fileInputRef.current?.click()}
                  className="font-medium border border-secondary-200 bg-secondary-50"
              >
                  上传 Metadata 文件 ($metadata)
              </Button>
              <p className="text-[10px] text-default-400 px-1">
                支持 .xml, .edmx 格式的元数据文件
              </p>
          </section>
        </div>
        
        <footer className="p-2 text-center text-[10px] text-default-300 border-t border-divider bg-content1">
          OData Master DevTools v1.0
        </footer>
      </div>
  );
};

const App: React.FC = () => {
    return (
        <NextUIProvider>
            <ToastProvider>
                <PopupContent />
            </ToastProvider>
        </NextUIProvider>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
