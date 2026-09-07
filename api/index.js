const TARGET = "http://benaka-app.ap-south-1.elasticbeanstalk.com";

export default async function handler(req, res) {
  try {
    const targetUrl =
      TARGET +
      (req.url || "/").replace(/^\/api/, "") || "/";

    const headers = new Headers();

    // Forward useful request headers
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (
        ![
          "host",
          "connection",
          "content-length",
          "x-forwarded-host",
          "x-forwarded-proto",
          "x-vercel-deployment-url"
        ].includes(key.toLowerCase())
      ) {
        if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      redirect: "manual",
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : req.body
    });

    // Forward response headers
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase();

      // Don't expose upstream host-specific headers
      if (
        ![
          "content-length",
          "transfer-encoding",
          "connection"
        ].includes(lower)
      ) {
        res.setHeader(key, value);
      }
    });

    // Rewrite upstream redirects so the browser stays on HTTPS
    const location = response.headers.get("location");

    if (location) {
      const rewritten = location.replace(
        /^http:\/\/benaka-app\.ap-south-1\.elasticbeanstalk\.com/i,
        ""
      );

      res.setHeader("location", rewritten || "/");
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.status(response.status).send(buffer);
  } catch (error) {
    console.error("Proxy error:", error);

    res.status(502).json({
      error: "Unable to reach Benaka App",
      message: error.message
    });
  }
}
