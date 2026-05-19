module.exports = function (eleventyConfig) {
  // 1. 🌟 核心修正：將所有靜態資源複製路徑全部對齊 src/ 開頭
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/static");
  eleventyConfig.addPassthroughCopy("src/images.txt");
  
  // 🌟【關鍵修正】強制 11ty 必須將 src/ai1 資料夾原封不動搬運到發布目錄！
  eleventyConfig.addPassthroughCopy("src/ai1"); 

  // 2. 註冊 posts 文章集合（精準掃描 src/posts/ 目錄下的所有 md 文件）
  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => {
      return b.date - a.date; // 最新發布的排在最前面
    });
  });

  // 3. 註冊首頁專用的 limit 過濾器
  eleventyConfig.addFilter("limit", function (arr, limit) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, limit);
  });

  // 4. 香港繁體標準時間格式化過濾器 (YYYY年MM月DD日)
  eleventyConfig.addFilter("dateFilter", function (dateValue) {
    if (!dateValue) return "";
    const d = new Date(dateValue);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}年${month}月${day}日`;
  });

  // 5. 核心路徑鎖定：以 "src" 資料夾作為沙盒開發根目錄
  return {
    dir: {
      input: "src",
      includes: "_includes", // 對應 src/_includes 檔案夾
      output: "_site",
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};