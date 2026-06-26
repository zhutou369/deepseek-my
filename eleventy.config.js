module.exports = function (eleventyConfig) {
  const systemTags = new Set(["all", "posts", "post", "nav", "eleventyNavigation"]);

  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/static");
  eleventyConfig.addPassthroughCopy("src/images.txt");
  eleventyConfig.addPassthroughCopy("src/ai1"); 

  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("tagList", function (collectionApi) {
    const tagSet = new Set();
    collectionApi.getFilteredByGlob("src/posts/*.md").forEach((item) => {
      const tags = Array.isArray(item.data.tags) ? item.data.tags : [];
      tags.forEach((tag) => {
        const normalizedTag = String(tag || "").trim();
        if (normalizedTag && !systemTags.has(normalizedTag)) {
          tagSet.add(normalizedTag);
        }
      });
    });
    return [...tagSet].sort((a, b) => a.localeCompare(b, "ms-MY"));
  });

  eleventyConfig.addFilter("limit", (arr, limit) => Array.isArray(arr) ? arr.slice(0, limit) : []);

  eleventyConfig.addFilter("postsByTag", function (posts, tag) {
    if (!Array.isArray(posts)) return [];
    return posts.filter((post) => {
      const tags = Array.isArray(post.data.tags) ? post.data.tags : [];
      return tags.includes(tag);
    });
  });

  eleventyConfig.addFilter("tagSlug", function (tag) {
    return encodeURIComponent(String(tag || "").trim());
  });

  // 🌟 马来西亚标准日期格式
  eleventyConfig.addFilter("dateFilter", function (dateValue) {
    if (!dateValue) return "";
    return new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateValue));
  });

  return {
    dir: { input: "src", includes: "_includes", output: "_site" },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};