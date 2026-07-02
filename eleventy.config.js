const siteData = require("./src/_data/site.json");

function assetVersion() {
  return siteData.assetVersion || "1";
}

function cacheBustStaticUrl(url) {
  const path = String(url || "").trim();
  if (!path.startsWith("/static/")) return path;
  if (/[?&]v=/.test(path)) return path;
  return `${path}?v=${assetVersion()}`;
}

function isPostIndexable(data, inputPath) {
  if (data.noindex === true) return false;
  if (data.featured === true) return true;
  if (data.generated === true) return false;

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
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });
  eleventyConfig.addPassthroughCopy({ "src/_redirects": "_redirects" });
  eleventyConfig.addPassthroughCopy("src/images.txt");
  eleventyConfig.addPassthroughCopy("src/ai1");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  if (require("fs").existsSync("src/BingSiteAuth.xml")) {
    eleventyConfig.addPassthroughCopy("src/BingSiteAuth.xml");
  }
  eleventyConfig.addPassthroughCopy({ "src/*.txt": "/" });

  eleventyConfig.addFilter("assetUrl", cacheBustStaticUrl);

  eleventyConfig.addTransform("cache-bust-static-assets", function (content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    const version = assetVersion();
    return content.replace(/\/static\/[^"'\s<>]+\.svg(?![^"']*[?&]v=)/g, (path) => `${path}?v=${version}`);
  });

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

  eleventyConfig.addCollection("homepagePosts", function (collectionApi) {
    const posts = collectionApi
      .getFilteredByGlob("src/posts/*.md")
      .filter((item) => isPostIndexable(item.data, item.inputPath));
    const pillars = posts
      .filter((item) => !/\/\d{4}-\d{2}-\d{2}-post-/.test(item.inputPath))
      .sort((a, b) => a.inputPath.localeCompare(b.inputPath, "ms-MY"));
    const featured = posts
      .filter((item) => /\/\d{4}-\d{2}-\d{2}-post-/.test(item.inputPath))
      .sort((a, b) => b.date - a.date);
    return [...pillars, ...featured].slice(0, 8);
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

  eleventyConfig.addFilter("limit", function (arr, limit) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, limit);
  });

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

  eleventyConfig.addFilter("rfc822", function (dateValue) {
    if (!dateValue) return "";
    return new Date(dateValue).toUTCString();
  });

  return {
    dir: { input: "src", includes: "_includes", output: "_site" },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
