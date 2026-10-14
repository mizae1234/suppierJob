import { NextResponse } from 'next/server';

// GET /api/docs
// หน้าเว็บแสดงผล Swagger UI แบบ Interactive โดยดึงสเปกจาก /api/openapi.json
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>SupplierJob API Documentation — Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.11.0/favicon-32x32.png" sizes="32x32" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .topbar {
      display: none !important;
    }
    .swagger-ui .info {
      margin: 30px 0;
    }
    .swagger-ui .info .title {
      color: #0f5238;
      font-weight: 800;
    }
    .swagger-ui .btn.authorize {
      color: #0f5238;
      border-color: #0f5238;
    }
    .swagger-ui .btn.authorize svg {
      fill: #0f5238;
    }
    .custom-header {
      background: linear-gradient(135deg, #0a3826 0%, #0f5238 100%);
      color: white;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .custom-header h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .custom-header a {
      color: #a7f3d0;
      text-decoration: none;
      font-size: 13px;
      padding: 6px 12px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      transition: all 0.2s;
    }
    .custom-header a:hover {
      background: rgba(255,255,255,0.1);
      color: white;
    }
  </style>
</head>
<body>
  <div class="custom-header">
    <h1>🚗 SupplierJob Management API — Documentation</h1>
    <div style="display:flex; gap:8px;">
      <a href="/api/openapi.json" target="_blank">📄 Raw OpenAPI JSON</a>
      <a href="/jobs/create-vehicle-slide">← กลับไปหน้าระบบ</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "BaseLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: "list"
      });
    };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
