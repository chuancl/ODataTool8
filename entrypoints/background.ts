
import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
  console.log('OData Master Background Service Started');

  // 由于移除了 <all_urls> 权限，后台自动检测逻辑已停用。
  // 插件现在完全依赖用户点击图标 (ActiveTab) 或手动输入/上传来触发。
  
  // Previous auto-detection logic removed for compliance.
});
