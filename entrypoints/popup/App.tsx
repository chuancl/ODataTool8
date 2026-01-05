
import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { NextUIProvider } from "@nextui-org/system";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Switch } from "@nextui-org/switch";
import { Divider } from "@nextui-org/divider";
import { ScrollShadow } from "@nextui-org/scroll-shadow";
import { getSettings, saveSettings, AppSettings } from '@/utils/storage';
import { Settings, ExternalLink, Plus, Trash2, Globe, Upload } from 'lucide-react';
import { browser } from 'wxt/browser';
import { storage } from 'wxt/storage';
import { ToastProvider, useToast } from '@/components/ui/ToastContext';
import '../../assets/main.css';

// 内部组件使用 Toast
const PopupContent: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [manualInput, setManualInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const toggleAutoDetect = (val: boolean) => {
    if (!settings) return;
    const newSettings = { ...settings, autoDetect: val };
    setSettings(newSettings);
    saveSettings(newSettings);
    toast.info(`Auto-Detect ${val ? 'Enabled' : 'Disabled'}`);
  };

  const addToWhitelist = () => {
    if (!settings || !newUrl) {
        if (!newUrl) toast.warning("Please enter a domain");
        return;
    }
    const newSettings = { ...settings, whitelist: [...settings.whitelist, newUrl] };
    setSettings(newSettings);
    saveSettings(newSettings);
    setNewUrl('');
    toast.success("Domain added to whitelist");
  };

  const removeFromWhitelist = (url: string) => {
    if (!settings) return;
    const newSettings = { ...settings, whitelist: settings.whitelist.filter(u => u !== url) };
    setSettings(newSettings);
    saveSettings(newSettings);
    toast.info("Domain removed");
  };

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

  if (!settings) return <div className="p-4">Loading...</div>;

  return (
      <div className="w-[360px] bg-background text-foreground flex flex-col h-fit max-h-[600px] border border-divider">
        {/* Header */}
        <header className="px-4 py-3 border-b border-divider flex items-center justify-between bg-content1">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h1 className="text-base font-bold">OData Master</h1>
          </div>
          <Settings className="w-4 h-4 text-default-400" />
        </header>

        <div className="p-4 flex flex-col gap-4">
          {/* Main Action: URL Input */}
          <section>
            <Input 
              label="快速访问 URL (Quick Access URL)" 
              placeholder="https://..." 
              size="sm" 
              variant="bordered"
              value={manualInput} 
              onValueChange={setManualInput}
              className="mb-2"
            />
            <Button 
              color="primary" 
              fullWidth 
              endContent={<ExternalLink size={16}/>} 
              onPress={() => openDashboard()}
              className="font-medium"
            >
              分析并可视化 (Analyze & Visualize)
            </Button>
          </section>

          {/* File Upload Section */}
          <section className="flex flex-col gap-2">
              <div className="text-xs text-default-500 font-medium">或上传文件 (Or upload file)</div>
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
                  className="font-medium border border-secondary-200"
              >
                  上传 Metadata 文件 ($metadata)
              </Button>
          </section>

          <Divider />

          {/* Settings */}
          <section className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-sm font-medium">自动检测 OData (Auto-Detect)</span>
              <span className="text-xs text-default-400">页面加载时扫描 Metadata</span>
            </div>
            <Switch size="sm" isSelected={settings.autoDetect} onValueChange={toggleAutoDetect} />
          </section>

          <Divider />

          {/* Whitelist */}
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              白名单 (Whitelist) <span className="text-xs font-normal text-default-400">(Always Active)</span>
            </h3>
            <div className="flex gap-2">
              <Input 
                size="sm" 
                placeholder="domain.com" 
                value={newUrl} 
                onValueChange={setNewUrl} 
                className="flex-1"
              />
              <Button isIconOnly size="sm" color="success" variant="flat" onPress={addToWhitelist}>
                <Plus size={16} />
              </Button>
            </div>
            
            <ScrollShadow className="max-h-[120px] w-full flex flex-col gap-2 mt-1">
              {settings.whitelist.length === 0 && (
                <div className="text-xs text-default-400 text-center py-2">无白名单域名 (No domains)</div>
              )}
              {settings.whitelist.map((url, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-content2 hover:bg-content3 transition-colors group">
                  <span className="text-xs truncate max-w-[240px]">{url}</span>
                  <button 
                    className="opacity-0 group-hover:opacity-100 text-danger hover:bg-danger/20 p-1 rounded transition-all"
                    onClick={() => removeFromWhitelist(url)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </ScrollShadow>
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
