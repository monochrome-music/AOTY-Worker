export default {
  async fetch(request) {
    const url = new URL(request.url);
    const albumQuery = url.searchParams.get("album");
    const artistQuery = url.searchParams.get("artist");

    if (!albumQuery || !artistQuery) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    };

    try {
      const fullSearchQuery = `${artistQuery} - ${albumQuery}`;
      const searchUrl = `https://www.albumoftheyear.org/search/albums/?q=${encodeURIComponent(fullSearchQuery)}`;
      
      const searchRes = await fetch(searchUrl, { headers });
      if (!searchRes.ok) throw new Error(`AOTY Search failed with status ${searchRes.status}`);

      let albumPageUrl = null;

      await new HTMLRewriter().on("div.albumBlock a", {
        element(el) {
          if (!albumPageUrl) {
            const href = el.getAttribute("href");
            if (href) albumPageUrl = `https://www.albumoftheyear.org${href}`;
          }
        },
      }).transform(searchRes).arrayBuffer();

      if (!albumPageUrl) {
        return new Response(JSON.stringify({ error: "Album not found" }), { 
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const albumRes = await fetch(albumPageUrl, { headers });
      
      let criticScore = "";
      let userScore = "";
      let criticReviewsRaw = "";
      let userReviewsRaw = "";
      let numReviewsCount = 0;

      const rewriter = new HTMLRewriter()
        .on('a[href="#critics"]', {
          text(t) { criticScore += t.text; }
        })
        .on('a[href="#users"]', {
          text(t) { userScore += t.text; }
        })
        .on('div.text.numReviews', {
          element() {
            numReviewsCount++;
          },
          text(t) {
            if (numReviewsCount === 1) criticReviewsRaw += t.text;
            if (numReviewsCount === 2) userReviewsRaw += t.text;
          }
        });

      await rewriter.transform(albumRes).arrayBuffer();


      const extractNumbers = (str) => {
        const match = str.match(/[\d,]+/);
        return match ? match[0] : "N/A";
      };

      return new Response(JSON.stringify({
        artist: artistQuery,
        album: albumQuery,
        url: albumPageUrl,
        critic: {
          score: criticScore.trim() || "N/A",
          count: extractNumbers(criticReviewsRaw)
        },
        user: {
          score: userScore.trim() || "N/A",
          count: extractNumbers(userReviewsRaw)
        }
      }), {
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
