module.exports = function (eleventyConfig) {
<<<<<<< Updated upstream
<<<<<<< Updated upstream
  // 1. 🌟 靜態資源搬運：將所有資源複製路徑全部對齊 src/ 開頭
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/static");
  eleventyConfig.addPassthroughCopy("src/images.txt");
=======
=======
>>>>>>> Stashed changes
  // 1. 將所有靜態資源複製路徑全部對齊 src/ 開頭
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/static");
  eleventyConfig.addPassthroughCopy("src/images.txt");
  eleventyConfig.addPassthroughCopy("src/ai1"); 
>>>>>>> Stashed changes

  // 2. 🌟 註冊全量文章集合：精準掃描 src/posts/ 目錄下的所有 .md 檔案
  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => {
      return b.date - a.date; // 最新發布與更新的文章會自動排在最前面
    });
  });

<<<<<<< Updated upstream
<<<<<<< Updated upstream
  // 3. 🌟 註冊首頁及存檔頁專用的 limit 限制過濾器（防止全量渲染導致首頁過長）
=======
  // 3. 註冊首頁及側邊欄專用的 limit 過濾器
>>>>>>> Stashed changes
=======
  // 3. 註冊首頁及側邊欄專用的 limit 過濾器
>>>>>>> Stashed changes
  eleventyConfig.addFilter("limit", function (arr, limit) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, limit);
  });

  // 4. 🌟 註冊繁體香港標準時間格式化過濾器 (渲染格式：YYYY年MM月DD日)
  eleventyConfig.addFilter("dateFilter", function (dateValue) {
    if (!dateValue) return "";
    const d = new Date(dateValue);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  });

  // 5. 🌟 核心路徑與沙盒沙箱配置：以 "src" 作為開發根目錄
  return {
    dir: {
      input: "src",
      includes: "_includes", // 對應 src/_includes/ 檔案夾
      output: "_site",       // 打包編譯後的靜態網頁輸出目錄
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};