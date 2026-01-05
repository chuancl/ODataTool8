
import React from 'react';
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Divider } from "@nextui-org/divider";
import { ScrollShadow } from "@nextui-org/scroll-shadow";
import { Image } from "@nextui-org/image";
import { BookOpen, Coffee, Heart, Lightbulb, Zap, Database } from 'lucide-react';

// --- 图片引用示例 ---
// 1. 将您的图片 (例如 alipay.jpg, wechat.jpg) 放入 src/assets/images/ 文件夹中
// 2. 使用 import 语句导入，如下所示：
// import alipayImg from '@/assets/images/alipay.jpg';
// import wechatImg from '@/assets/images/wechat.jpg';

// 这里使用占位图作为示例，请替换为您真实的二维码图片
import placeholderImg from '@/assets/images/placeholder.svg';

interface UsageGuideProps {
    isDark: boolean;
}

export const UsageGuide: React.FC<UsageGuideProps> = ({ isDark }) => {
    return (
        <div className="h-full w-full p-4 md:p-8 max-w-5xl mx-auto">
            <ScrollShadow className="h-full pr-4">
                <div className="flex flex-col gap-8 pb-10">
                    
                    {/* 1. 标题区 */}
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                            OData Master 使用指南
                        </h1>
                        <p className="text-default-500">
                            专为开发者打造的 OData 可视化、查询构建与数据模拟工具
                        </p>
                    </div>

                    {/* 2. 主要功能介绍 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-content2/50 border border-divider">
                            <CardHeader className="flex gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary"><Database size={24}/></div>
                                <div className="flex flex-col">
                                    <p className="text-md font-bold">可视化建模</p>
                                    <p className="text-small text-default-500">ER Diagram</p>
                                </div>
                            </CardHeader>
                            <CardBody>
                                <p className="text-sm text-default-600">
                                    自动解析 $metadata，生成交互式实体关系图。支持高亮关联、查看字段属性、导出 CSV 等功能。
                                </p>
                            </CardBody>
                        </Card>
                        <Card className="bg-content2/50 border border-divider">
                            <CardHeader className="flex gap-3">
                                <div className="p-2 rounded-lg bg-secondary/10 text-secondary"><Zap size={24}/></div>
                                <div className="flex flex-col">
                                    <p className="text-md font-bold">查询构建器</p>
                                    <p className="text-small text-default-500">Query Builder</p>
                                </div>
                            </CardHeader>
                            <CardBody>
                                <p className="text-sm text-default-600">
                                    无需手写 URL，通过 UI 界面构建筛选($filter)、排序、分页等复杂查询，并生成 SAPUI5/Java/C# 代码。
                                </p>
                            </CardBody>
                        </Card>
                        <Card className="bg-content2/50 border border-divider">
                            <CardHeader className="flex gap-3">
                                <div className="p-2 rounded-lg bg-warning/10 text-warning"><Lightbulb size={24}/></div>
                                <div className="flex flex-col">
                                    <p className="text-md font-bold">数据模拟</p>
                                    <p className="text-small text-default-500">Mock Data</p>
                                </div>
                            </CardHeader>
                            <CardBody>
                                <p className="text-sm text-default-600">
                                    基于 Schema 智能生成仿真测试数据。支持 Faker.js 策略配置，一键批量生成测试 Payload。
                                </p>
                            </CardBody>
                        </Card>
                    </div>

                    <Divider />

                    {/* 3. 使用技巧 (包含图片引用示例) */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <BookOpen size={20} className="text-primary"/> 快速入门
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div className="space-y-4 text-sm text-default-600 leading-relaxed">
                                <p>
                                    <strong className="text-foreground">1. 加载元数据：</strong> 
                                    在浏览器打开任意 OData 服务（以 .svc 结尾），插件会自动检测（需在设置中开启自动跳转）或点击插件图标手动上传 $metadata 文件。
                                </p>
                                <p>
                                    <strong className="text-foreground">2. ER 图交互：</strong> 
                                    按住 <code className="bg-default-100 px-1 rounded">Ctrl</code> 点击实体可多选高亮。点击连线上的关系标签可跳转到关联实体。
                                </p>
                                <p>
                                    <strong className="text-foreground">3. 导出数据：</strong> 
                                    在表格视图中，勾选需要的数据行，点击右上角的 "导出 Excel" 即可下载包含层级关系的 Excel 文件。
                                </p>
                            </div>
                            
                            {/* 图片引用示例区域 */}
                            <div className="bg-content2 p-4 rounded-xl border border-divider flex flex-col items-center gap-2">
                                <span className="text-xs text-default-400 font-mono self-start mb-2">
                                    // 示例：引用 assets/images 下的图片
                                </span>
                                <Image 
                                    src={placeholderImg} 
                                    alt="Feature Demo" 
                                    width={200}
                                    className="opacity-80"
                                />
                                <span className="text-xs text-default-400 mt-2">
                                    (此处展示功能截图)
                                </span>
                            </div>
                        </div>
                    </section>

                    <Divider />

                    {/* 4. 打赏区域 */}
                    <section className="flex flex-col items-center gap-6 pt-4">
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                                <Heart size={20} className="text-danger fill-danger"/> 支持作者
                            </h2>
                            <p className="text-default-500 text-sm max-w-md">
                                如果这个工具帮助您提高了开发效率，欢迎请我喝杯咖啡！您的支持是我持续更新的动力。
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-4">
                            {/* 微信支付 */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-40 h-40 bg-white p-2 rounded-xl shadow-md border border-default-200 flex items-center justify-center overflow-hidden">
                                    {/* 请替换 src={wechatImg} */}
                                    <Image src={placeholderImg} alt="WeChat Pay" className="w-full h-full object-contain" />
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium text-[#07c160]">
                                    <Coffee size={16}/> 微信支付
                                </div>
                            </div>

                            {/* 支付宝 */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-40 h-40 bg-white p-2 rounded-xl shadow-md border border-default-200 flex items-center justify-center overflow-hidden">
                                    {/* 请替换 src={alipayImg} */}
                                    <Image src={placeholderImg} alt="Alipay" className="w-full h-full object-contain" />
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium text-[#1677ff]">
                                    <Coffee size={16}/> 支付宝
                                </div>
                            </div>

                            {/* PayPal */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-40 h-40 bg-white p-2 rounded-xl shadow-md border border-default-200 flex items-center justify-center overflow-hidden">
                                    {/* 请替换 src={paypalImg} */}
                                    <Image src={placeholderImg} alt="PayPal" className="w-full h-full object-contain" />
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium text-[#003087]">
                                    <Coffee size={16}/> PayPal
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 底部声明 */}
                    <div className="text-center text-xs text-default-400 pt-10 pb-4">
                        <p>OData Master DevTools is open source.</p>
                        <p>© {new Date().getFullYear()} Developed with ❤️</p>
                    </div>

                </div>
            </ScrollShadow>
        </div>
    );
};
