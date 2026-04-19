
const html = "<p><!--StartFragment--><meta charset=\"utf-8\"><b></b></p><p><b></b></p><p><!--StartFragment--><meta charset=\"utf-8\"><b></b></p><p>You are sitting in front of your laptop, hand shaking over the trackpad. Email open. Subject line: \u201cYour admission decision is ready.\u201d&nbsp;</p><p>Your parents are in the next room pretending not to pace. Your heart rate is loud enough to hear.</p>";

let cleaned = html || "";

// Strip WordPress comments and classes
cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");
cleaned = cleaned.replace(/\s*class=["'][^"']*wp-[^"']*["']/gi, "");

console.log("After comment strip:", cleaned.substring(0, 200));

// Add drop cap to first paragraph (first letter only)
cleaned = cleaned.replace(
  /(<p[^>]*>)(\s*)([A-Za-z])/,
  (match, pTag, whitespace, firstLetter) => {
    if (cleaned.indexOf(match) === cleaned.indexOf('<p')) {
        console.log("Applying drop cap to:", match);
      return `${pTag}${whitespace}<span class=\"drop-cap\">${firstLetter}</span>`;
    }
    console.log("NOT applying drop cap. match index:", cleaned.indexOf(match), "first <p> index:", cleaned.indexOf('<p'));
    return match;
  }
);

console.log("Final cleaned (first 500 chars):", cleaned.substring(0, 500));
