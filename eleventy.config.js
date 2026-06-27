function isPostIndexable(data, inputPath) {
  if (data.noindex === true || data.generated === true) return false;
  if (data.featured === true) return true;

  const path = inputPath || "";
  if (/\/posts\/\d{4}-\d{2}-\d{2}-post-\d+-\d+\.md$/i.test(path)) return false;

  const desc = data.description || "";
  const title = data.title || "";
  const tags = Array.isArray(data.tags) ? data.tags : [];

  if (desc.includes("Ketahui cara lengkap dan langkah demi langkah")) return false;
  if (desc.includes("Analisis teknikal mendalam mengenai")) return false;
  if (/Terokai teknik|Kuasai strategi|memastikan aplikasi anda|Tingkatkan efisiensi dan transformasi digital/.test(desc)) return false;
  if (/Rasmi|rangkaian strategik|Strategi SEO Hub|Memacu PKS|Menguasai|Revolusi AI|Panduan Lengkap|bertaraf dunia|Hub deepseek-my\.com|Optimasi DeepSeek|Pengimbangan Beban/.test(title)) return false;
  if (/SEO Malaysia|Automasi posting blog 11ty/.test(title)) return false;
  if (tags.includes("SEO Malaysia")) return false;

  return true;
}

module.exports = function (eleventyConfig) {
  const systemTags = new Set(["all", "posts", "post", "nav", "eleventyNavigation"]);

  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/static");
  eleventyConfig.addPassthroughCopy("src/images.txt");
  eleventyConfig.addPassthroughCopy("src/ai1");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy({ "src/*.txt": "/" });

  eleventyConfig.addGlobalData("eleventyComputed", {
    noindex: (data) => {
      if (data.noindex === true) return true;
      const inputPath = data.page?.inputPath || "";
      if (inputPath.includes("/tags/") || inputPath.endsWith("tags.njk") || inputPath.endsWith("tag-list.njk")) {
        return true;
      }
      if (!inputPath.includes("posts")) return false;
      return !isPostIndexable(data, inputPath);
    }
  });

  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("indexablePosts", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/posts/*.md")
      .filter((item) => isPostIndexable(item.data, item.inputPath))
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("tagList", function (collectionApi) {
    const tagSet = new Set();
    collectionApi
      .getFilteredByGlob("src/posts/*.md")
      .filter((item) => isPostIndexable(item.data, item.inputPath))
      .forEach((item) => {
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

  eleventyConfig.addFilter("limit", (arr, limit) => (Array.isArray(arr) ? arr.slice(0, limit) : []));

  eleventyConfig.addFilter("postsByTag", function (posts, tag) {
    if (!Array.isArray(posts)) return [];
    return posts.filter((post) => {
      if (!isPostIndexable(post.data, post.inputPath)) return false;
      const tags = Array.isArray(post.data.tags) ? post.data.tags : [];
      return tags.includes(tag);
    });
  });

  eleventyConfig.addFilter("tagSlug", function (tag) {
    return encodeURIComponent(String(tag || "").trim());
  });

  eleventyConfig.addFilter("dateFilter", function (dateValue) {
    if (!dateValue) return "";
    return new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "long", year: "numeric" }).format(new Date(dateValue));
  });

  eleventyConfig.addFilter("htmlDate", function (dateValue) {
    if (!dateValue) return "";
    return new Date(dateValue).toISOString().slice(0, 10);
  });

  return {
    dir: { input: "src", includes: "_includes", output: "_site" },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
