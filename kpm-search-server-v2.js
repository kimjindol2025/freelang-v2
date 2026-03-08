const http = require("http");
const fs = require("fs");
const url = require("url");

const PORT = 4001;

// Load indices
let packages = {};
let searchIndex = [];

try {
  packages = JSON.parse(fs.readFileSync("./.kpm-registry/freelang-packages.json", "utf-8"));
  const indexData = JSON.parse(fs.readFileSync("./.kpm-registry/search-index.json", "utf-8"));
  searchIndex = indexData.search_index;
  console.log("✅ Loaded", packages.packages.length, "packages");
  console.log("✅ Loaded", searchIndex.length, "search indices");
} catch (e) {
  console.error("Error loading data:", e);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Health check
  if (pathname === "/api/ping") {
    return res.end(JSON.stringify({ status: "ok", timestamp: new Date() }));
  }

  // Search packages
  if (pathname === "/api/search") {
    const q = (query.q || "").toLowerCase();

    if (q === "") {
      const allPackages = packages.packages.map(p => ({
        id: p.id,
        name: p.name,
        version: p.version,
        description: p.description,
        category: p.category
      }));
      return res.end(JSON.stringify({ results: allPackages, total: allPackages.length }));
    }

    const results = searchIndex
      .filter(idx => idx.searchable_text.includes(q) || idx.name.includes(q))
      .map(idx => {
        const pkg = packages.packages.find(p => p.id === idx.id);
        return {
          id: pkg.id,
          name: pkg.name,
          version: pkg.version,
          description: pkg.description,
          category: pkg.category,
          ranking: idx.ranking,
          features: pkg.features
        };
      })
      .sort((a, b) => b.ranking - a.ranking);

    return res.end(JSON.stringify({
      query: q,
      results,
      total: results.length
    }));
  }

  // Get package details
  if (pathname.startsWith("/api/package/")) {
    const pkgId = pathname.replace("/api/package/", "");
    const pkg = packages.packages.find(p => p.id === pkgId);

    if (!pkg) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: "Package not found" }));
    }

    return res.end(JSON.stringify(pkg));
  }

  // List all packages
  if (pathname === "/api/packages") {
    const list = packages.packages.map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      description: p.description,
      category: p.category,
      level: p.level,
      completeness: p.completeness
    }));
    return res.end(JSON.stringify({ packages: list, total: list.length }));
  }

  // List packages by category
  if (pathname === "/api/packages/category") {
    const category = (query.cat || "").toLowerCase();

    if (!category) {
      // Return all categories with count
      const categories = {};
      packages.packages.forEach(p => {
        categories[p.category] = (categories[p.category] || 0) + 1;
      });
      return res.end(JSON.stringify({ categories }));
    }

    const categoryPackages = packages.packages.filter(p =>
      p.category.toLowerCase() === category
    );

    return res.end(JSON.stringify({
      category,
      packages: categoryPackages,
      total: categoryPackages.length
    }));
  }

  // Statistics
  if (pathname === "/api/stats") {
    const stats = {
      total_packages: packages.packages.length,
      total_downloads: packages.packages.reduce((sum, p) => sum + (p.downloads || 0), 0),
      categories: {},
      levels: {}
    };

    packages.packages.forEach(p => {
      stats.categories[p.category] = (stats.categories[p.category] || 0) + 1;
      stats.levels[p.level] = (stats.levels[p.level] || 0) + 1;
    });

    return res.end(JSON.stringify(stats));
  }

  // Top packages by ranking
  if (pathname === "/api/top") {
    const limit = Math.min(parseInt(query.limit) || 10, 50);
    const topPackages = packages.packages
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit);

    return res.end(JSON.stringify({
      top: topPackages,
      total: topPackages.length
    }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log("🚀 KPM Search Server v2 running on http://localhost:" + PORT);
  console.log("📍 Endpoints:");
  console.log("   GET /api/ping - Health check");
  console.log("   GET /api/search?q=freelang - Search packages");
  console.log("   GET /api/package/@freelang/compiler - Get package details");
  console.log("   GET /api/packages - List all packages");
  console.log("   GET /api/packages/category - List by category (?cat=native-libraries)");
  console.log("   GET /api/stats - Statistics");
  console.log("   GET /api/top - Top packages by rating (?limit=10)");
});
