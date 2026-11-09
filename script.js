 /*
"Talk is cheap. Show me the code."
—Linus Torvalds
*/

// Palabas · WS1 TV Show Search code-along (TVmaze API, no key needed)
// Open DevTools (F12): keep the Console AND the Network tab open.
// Sample or live mode: see config.js.

// ---------- Given: page elements ----------
const form = document.getElementById("searchForm");
const input = document.getElementById("query");
const statusText = document.getElementById("status");
const results = document.getElementById("results");
const dialog = document.getElementById("details");
const detailsBody = document.getElementById("detailsBody");
const closeBtn = document.getElementById("closeDetails");
const modeBadge = document.getElementById("modeBadge");

// ---------- Given: the API's URLs ----------
const API = "https://api.tvmaze.com";

// Turns "Breaking Bad" into "breaking-bad" (used for the sample-data file names)
function slug(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// e.g. https://api.tvmaze.com/search/shows?q=breaking%20bad
function searchURL(query) {
  if (USE_SAMPLE_DATA) return `data/search/${slug(query)}.json`;
  return `${API}/search/shows?q=${encodeURIComponent(query)}`;
}

// e.g. https://api.tvmaze.com/shows/169
function showURL(id) {
  return USE_SAMPLE_DATA ? `data/shows/${id}.json` : `${API}/shows/${id}`;
}

// e.g. https://api.tvmaze.com/shows/169/cast
function castURL(id) {
  return USE_SAMPLE_DATA ? `data/cast/${id}.json` : `${API}/shows/${id}/cast`;
}

// e.g. https://api.tvmaze.com/shows/169/seasons
function seasonsURL(id) {
  return USE_SAMPLE_DATA ? `data/seasons/${id}.json` : `${API}/shows/${id}/seasons`;
}

// ---------- Given: helpers (no need to change) ----------

// Shows a message under the search box. type: "info", "loading" or "error"
function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = "status " + type;
}

// Makes an element with an optional class and text: el("span", "year", "2008")
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A poster <img>, or a placeholder when the show has no image (image is null)
function createPoster(show, size = "medium") {
  if (!show.image) {
    return el("span", "poster none", "No poster");
  }
  const img = el("img", "poster");
  img.src = show.image[size] || show.image.medium;
  img.alt = `Poster: ${show.name}`;
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(el("span", "poster none", "No poster")));
  return img;
}

// "2008–2013", or "2016–" for a show that is still running
function yearRange(show) {
  const start = show.premiered ? show.premiered.slice(0, 4) : "?";
  const end = show.ended ? show.ended.slice(0, 4) : "";
  return `${start}–${end}`;
}

// TVmaze summaries contain HTML like "<p><b>Friends</b> follows…</p>".
// This keeps only the text. (Never put text from an API into innerHTML:
// if it contained a <script> or an onerror, it could run on your page.)
function stripTags(html) {
  if (!html) return "No summary yet.";
  return new DOMParser().parseFromString(html, "text/html").body.textContent;
}

// Close the details pop-up (Step 4) with the × button or by clicking outside it
closeBtn.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

// Show which mode we're in
modeBadge.textContent = USE_SAMPLE_DATA ? "Sample data" : "Live · TVmaze";
modeBadge.classList.toggle("live", !USE_SAMPLE_DATA);

// STEP 1 — Your first API request
// TODO: async function testRequest(): fetch searchURL("friends"), log the status and the JSON array


// STEP 2 — Search and show the results
// TODO: renderResults(items), searchShows(query), and a submit listener on the form

function renderResults(items) {
  results.replaceChildren();

  for (const item of items) {
    const show = item.show;       // each result looks like { score, show }

    const card = el("button", "card");
    card.type = "button";
    card.dataset.id = show.id;    // used later to load this show's details

    const genres = show.genres.length ? show.genres.join(", ") : "No genres listed";
    const average = show.rating && show.rating.average;
    const ratingText = average ? `★ ${average}` : "Not rated yet";

    card.append(
      createPoster(show),
      el("span", "title", show.name),
      el("span", "year", yearRange(show)),
      el("span", "genres", genres),
      el("span", "rating", ratingText)
    );

    results.append(card);
  }
}

// Fetches the search results for a query, reads the JSON, and passes it to renderResults
async function searchShows(query) {
  const response = await fetch(searchURL(query));
  const data = await response.json();
  renderResults(data);
}

// Runs when the form is submitted: stops the page reload, reads and trims
// the input, ignores an empty box, and starts the search
form.addEventListener("submit", function (event) {
  event.preventDefault();
  const query = input.value.trim();
  if (query === "") return;
  searchShows(query);
});

// STEP 3 — getJSON(): one careful helper for every request
// TODO: catch network errors, check 429 and response.ok; rewrite searchShows with try / catch and an empty-array check

async function getJSON(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (networkError) {
    // fetch only rejects when there is NO answer at all: offline, blocked, server down
    throw new Error("Can't reach TVmaze. Check your internet, or set USE_SAMPLE_DATA = true in config.js.");
  }

  if (response.status === 429) {
    // TVmaze allows about 20 requests every 10 seconds per internet connection
    throw new Error("Too many requests (429). Wait 10 seconds and try again.");
  }
  if (!response.ok) {
    throw new Error(
      USE_SAMPLE_DATA
        ? "Sample mode only knows: friends, office, breaking bad, stranger things, sherlock, thrones, sample."
        : `Request failed (HTTP ${response.status}).`
    );
  }
  return response.json();
}

// this replaces the Step 2 searchShows
async function searchShows(query) {
  setStatus(`Searching for "${query}"…`, "loading");
  results.innerHTML = "";

  try {
    const data = await getJSON(searchURL(query));
    // Show the raw response in the Console: a no-match search prints []
    console.log("Data:", data);
    console.log("Number of results:", data.length);


    // An empty array is NOT an error to fetch (HTTP 200). We must check it.
    if (data.length === 0) {
      console.log("No match: TVmaze returned an empty array [] with status 200");
      setStatus(`No shows found for "${query}". Check the spelling.`, "error");
      return;
    }

    renderResults(data);
    setStatus(`${data.length} ${data.length === 1 ? "show" : "shows"} found for "${query}"`);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

// STEP 4 — Click a show to see its details
// TODO: one click listener on #results, showDetails(id), renderDetails(show)

results.addEventListener("click", function (event) {
  const card = event.target.closest(".card");
  if (!card) return;
  showDetails(card.dataset.id);
});

// Shows "Loading details…", opens the pop-up, fetches one show, and fills the pop-up or shows an error message inside it
async function showDetails(id) {
  detailsBody.replaceChildren(el("p", "status loading", "Loading details…"));
  if (!dialog.open) dialog.showModal();

  try {
    const show = await getJSON(showURL(id));
    renderDetails(show);
  } catch (error) {
    detailsBody.replaceChildren(el("p", "status error", error.message));
  }
}

// Builds the pop-up content for one show: poster, name, meta line,rating, summary and a TVmaze link. Missing values are handled safely.  
function renderDetails(show) {
  const info = el("div", "info");

  // Some shows have no network, so fall back to webChannel, then to nothing
  const network = show.network
    ? show.network.name
    : show.webChannel
    ? show.webChannel.name
    : null;

  // runtime can be null (Stranger Things), so fall back to averageRuntime
  const minutes = show.runtime || show.averageRuntime;

  const metaParts = [
    yearRange(show),
    network,
    show.genres.length ? show.genres.join(", ") : null,
    minutes ? `${minutes} min` : null,
  ].filter(Boolean);                                // drop anything that is null

  const average = show.rating && show.rating.average;

  info.append(
    el("h2", "", show.name),
    el("p", "meta", metaParts.join(" · ")),
    el("p", "score", average ? `★ ${average} / 10` : "Not rated yet"),
    // el() uses textContent and stripTags removes the HTML, so never innerHTML
    el("p", "plot", stripTags(show.summary))
  );

  const links = el("div", "links");
  const link = el("a", "", "View on TVmaze");
  link.href = show.url;
  link.target = "_blank";
  link.rel = "noopener";
  links.append(link);
  info.append(links);

  detailsBody.replaceChildren(createPoster(show, "original"), info);
}

// STEP 5 — Promise.all: show + cast + seasons at the same time
// TODO: rewrite showDetails with Promise.all, and renderDetails(show, cast, seasons)

async function showDetails(id) {
  detailsBody.replaceChildren(el("p", "status loading", "Loading details…"));
  if (!dialog.open) dialog.showModal();

  try {
    const start = performance.now();

    // All three requests start together; if any one fails, we jump to catch
    const [show, cast, seasons] = await Promise.all([
      getJSON(showURL(id)),
      getJSON(castURL(id)),
      getJSON(seasonsURL(id)),
    ]);

    console.log(`3 requests in ${Math.round(performance.now() - start)} ms`);
    renderDetails(show, cast, seasons);
  } catch (error) {
    detailsBody.replaceChildren(el("p", "status error", error.message));
  }
}

// Builds the pop-up content: everything from Task 4, plus the number of seasons and up to 6 cast members like "Bryan Cranston as Walter White"
function renderDetails(show, cast, seasons) {
  const info = el("div", "info");

  const network = show.network
    ? show.network.name
    : show.webChannel
    ? show.webChannel.name
    : null;
  const minutes = show.runtime || show.averageRuntime;

  const metaParts = [
    yearRange(show),
    network,
    show.genres.length ? show.genres.join(", ") : null,
    minutes ? `${minutes} min` : null,
  ].filter(Boolean);

  const average = show.rating && show.rating.average;
  const seasonText = `${seasons.length} ${seasons.length === 1 ? "season" : "seasons"}`;

  info.append(
    el("h2", "", show.name),
    el("p", "meta", metaParts.join(" · ")),
    el("p", "score", average ? `★ ${average} / 10` : "Not rated yet"),
    el("p", "meta", seasonText),
    el("p", "plot", stripTags(show.summary))
  );

  // Up to 6 cast members
  info.append(el("h3", "", "Cast"));
  const castList = el("ul", "cast");
  if (cast.length === 0) {
    castList.append(el("li", "", "No cast listed yet."));
  }
  for (const member of cast.slice(0, 6)) {
    const li = el("li", "", member.person.name);
    li.append(el("span", "", ` as ${member.character.name}`));
    castList.append(li);
  }
  info.append(castList);

  const links = el("div", "links");
  const link = el("a", "", "View on TVmaze");
  link.href = show.url;
  link.target = "_blank";
  link.rel = "noopener";
  links.append(link);
  info.append(links);

  detailsBody.replaceChildren(createPoster(show, "original"), info);
}

// Holds the timer id so each new keystroke can cancel the previous timer
let typingTimer;

// Runs on every keystroke: waits 500 ms after the user stops typing, then searches, so typing "friends" quickly sends one request instead of seven
input.addEventListener("input", function () {
  clearTimeout(typingTimer);          // cancel the timer from the last keystroke
  const query = input.value.trim();
  if (query === "") return;        // do nothing for an empty box
  typingTimer = setTimeout(function () {
    searchShows(query);
  }, 500);
});