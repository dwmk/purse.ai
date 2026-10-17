import React, { useEffect } from 'react';

/**
 * Purse landing page.
 * The layout and styling are ported directly from the supplied HTML reference.
 */
export const LandingPage: React.FC = () => {
  useEffect(() => {
    const f: [string, number, number, number, number, string][] = [
      ["Money in checking", 640, 0, 2000, 10, "bal"],
      ["Lowest balance you’ll allow", 100, 0, 500, 10, "floor"],
      ["Bills still to pay", 210, 0, 800, 10, "bills"],
      ["Days until payday", 12, 1, 30, 1, "days"]
    ];
    const values: Record<string, number> = {};
    const box = document.getElementById("sliders");
    if (!box) return;

    box.innerHTML = "";
    f.forEach((item) => {
      values[item[5]] = item[1];
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML =
        "<label for='" + item[5] + "'>" + item[0] + "</label>" +
        "<b id='v" + item[5] + "'></b>" +
        "<input id='" + item[5] + "' type='range' min='" + item[2] +
        "' max='" + item[3] + "' step='" + item[4] + "' value='" + item[1] + "'>";
      box.appendChild(row);
      const input = row.querySelector("input");
      input?.addEventListener("input", (event) => {
        values[item[5]] = Number((event.target as HTMLInputElement).value);
        updateCalculator();
      });
    });

    const updateCalculator = () => {
      f.forEach((item) => {
        const value = document.getElementById("v" + item[5]);
        if (value) value.textContent = item[5] === "days" ? values.days + " days" : "$" + values[item[5]];
      });
      const cushion = Math.max(0, values.bal - values.floor - values.bills);
      const daily = cushion / values.days;
      const output = document.getElementById("out");
      if (output) {
        output.textContent = "$" + daily.toFixed(2) + "/day";
        output.className = daily < 10 ? "low" : "";
      }
      const sub = document.getElementById("sub");
      if (sub) sub.textContent = "Cushion $" + cushion + " over " + values.days + " days. Bills and your floor are already covered.";
    };
    updateCalculator();

    const checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>(".sub input"));
    const updateYearlySavings = () => {
      const total = checkboxes.reduce((sum, checkbox) => sum + (checkbox.checked ? Number(checkbox.dataset.c) : 0), 0);
      const yearly = document.getElementById("yr");
      if (yearly) yearly.textContent = "$" + (total * 12).toFixed(2);
    };
    checkboxes.forEach((checkbox) => checkbox.addEventListener("change", updateYearlySavings));
    updateYearlySavings();

    let balance = 640;
    let stage = "Staged";
    const buttons = document.getElementById("btns");
    const renderActions = () => {
      if (!buttons) return;
      buttons.innerHTML = "";
      ["Staged", "Applied", "Reverted"].forEach((name) => {
        const element = document.getElementById("s-" + name);
        if (element) element.className = name === stage ? "on" : "";
      });
      const balanceElement = document.getElementById("bal");
      if (balanceElement) balanceElement.textContent = "$" + balance.toFixed(2);
      const status = document.getElementById("st");
      const messages: Record<string, string> = {
        Staged: "Waiting for you",
        Applied: "Applied",
        Reverted: "Reverted, balance restored",
        Rejected: "Rejected, nothing changed"
      };
      if (status) status.textContent = messages[stage] || stage;

      const addButton = (label: string, action: () => void, ghost = false) => {
        const button = document.createElement("button");
        button.className = "btn" + (ghost ? " ghost" : "");
        button.textContent = label;
        button.type = "button";
        button.addEventListener("click", action);
        buttons.appendChild(button);
      };

      if (stage === "Staged") {
        addButton("Confirm", () => { stage = "Applied"; balance = 622; renderActions(); });
        addButton("Reject", () => { stage = "Rejected"; renderActions(); }, true);
      } else if (stage === "Applied") {
        addButton("Revert", () => { stage = "Reverted"; balance = 640; renderActions(); }, true);
      } else {
        addButton("Try again", () => { stage = "Staged"; balance = 640; renderActions(); }, true);
      }
    };
    renderActions();

    return () => {
      // The page is removed on unmount, so DOM-bound listeners are discarded with it.
    };
  }, []);

  return (
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
    <div className="purse-landing">
      <style>{`
        
:root{--bg:#F4F1FF;--ink:#1E1538;--mute:#5E557D;--card:#fff;--line:#D9D2F2;--coral:#FF5C7A;--mint:#1FB36F;--sun:#F5B700;--btn:#1E1538;--btnt:#fff;
box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#150F29;--ink:#F1EDFF;--mute:#A89FCB;--card:#211840;--line:#38295F;--coral:#FF7C94;--mint:#3DDC97;--sun:#FFC93C;--btn:#F1EDFF;--btnt:#150F29}}
:root[data-theme="dark"]{--bg:#150F29;--ink:#F1EDFF;--mute:#A89FCB;--card:#211840;--line:#38295F;--coral:#FF7C94;--mint:#3DDC97;--sun:#FFC93C;--btn:#F1EDFF;--btnt:#150F29}
*,*::before,*::after{box-sizing:inherit}
html{scroll-padding-top:env(safe-area-inset-top,0px);scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:400 1.0625rem/1.6 Figtree,system-ui,sans-serif}
h1,h2,h3{font-family:"Bricolage Grotesque",Figtree,sans-serif;line-height:1.05;margin:0;letter-spacing:-.02em}
h1{font-size:clamp(2.6rem,7vw,5rem);font-weight:800}
h2{font-size:clamp(1.9rem,4.5vw,3rem);font-weight:800}
h3{font-size:1.3rem;font-weight:500;letter-spacing:-.01em}
p{margin:0}
a{color:inherit}
:focus-visible{outline:3px solid var(--coral);outline-offset:3px}
.wrap{max-width:1080px;margin:0 auto;padding:0 1.25rem}
section{padding:5rem 0}
.lead{color:var(--mute);max-width:56ch;margin-top:1rem}
nav{display:flex;justify-content:space-between;align-items:center;padding:1.25rem 0}
.logo{font:800 1.5rem "Bricolage Grotesque",sans-serif;text-decoration:none}
.btn{display:inline-block;background:var(--btn);color:var(--btnt);border:0;border-radius:999px;padding:.8rem 1.5rem;font:600 1rem Figtree,sans-serif;text-decoration:none;cursor:pointer}
.btn.ghost{background:transparent;color:var(--ink);border:2px solid var(--ink)}
.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:3rem;align-items:center;padding:3rem 0 5rem}
.hero .cta{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:2rem}
.calc{background:var(--card);border:2px solid var(--ink);border-radius:28px;padding:1.5rem;box-shadow:8px 8px 0 var(--coral)}
.calc h3{margin-bottom:1rem}
.row{display:grid;grid-template-columns:1fr auto;gap:.25rem .5rem;margin-bottom:.9rem;font-size:.95rem}
.row input{grid-column:1/-1;width:100%;accent-color:var(--coral)}
.row b{font-variant-numeric:tabular-nums}
.big{border-top:2px dashed var(--line);padding-top:1rem;margin-top:.5rem}
.big strong{display:block;font:800 3.4rem/1 "Bricolage Grotesque",sans-serif;color:var(--mint)}
.big strong.low{color:var(--coral)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center}
.chat{background:var(--card);border:1px solid var(--line);border-radius:24px;padding:1.25rem;display:grid;gap:.75rem}
.me{justify-self:end;background:var(--btn);color:var(--btnt);padding:.6rem 1rem;border-radius:18px 18px 4px 18px;max-width:80%}
.bot{background:var(--bg);border-radius:18px 18px 18px 4px;padding:.9rem 1rem;font-size:.95rem}
.chips{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.5rem}
.chips span{border:1px solid var(--line);background:var(--card);border-radius:8px;padding:.15rem .6rem;font-size:.85rem}
.env{display:grid;gap:1.25rem;margin-top:2.5rem}
.env .top{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:baseline}
.env small{color:var(--mute)}
.bar{height:18px;border-radius:99px;background:var(--line);overflow:hidden;margin:.4rem 0}
.bar i{display:block;height:100%;border-radius:99px;background:var(--mint)}
.bar i.warn{background:var(--sun)}
.pct{font:800 2.6rem/1 "Bricolage Grotesque",sans-serif}
.list{margin-top:2rem;display:grid;gap:.75rem}
.sub{display:grid;grid-template-columns:auto 1fr auto;gap:1rem;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:1rem 1.25rem;cursor:pointer}
.sub input{width:1.3rem;height:1.3rem;accent-color:var(--coral)}
.sub small{display:block;color:var(--mute)}
.tag{font-size:.8rem;border-radius:99px;padding:.1rem .6rem;background:var(--sun);color:#1E1538;margin-left:.4rem}
.total{margin-top:1.5rem;font-size:1.1rem}
.total b{font:800 2.4rem "Bricolage Grotesque",sans-serif;color:var(--coral)}
.flow{display:flex;gap:.5rem;flex-wrap:wrap;margin:1.5rem 0}
.flow span{border:2px solid var(--line);border-radius:99px;padding:.3rem 1rem;font-weight:600;color:var(--mute)}
.flow span.on{border-color:var(--ink);color:var(--ink);background:var(--card)}
.act{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:1.25rem}
.act .btns{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem}
.act .btn{padding:.55rem 1.1rem}
.runway{background:var(--ink);color:var(--bg);border-radius:32px;padding:3rem;display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:center}
.runway .n{font:800 clamp(4rem,10vw,7rem)/1 "Bricolage Grotesque",sans-serif;color:var(--sun)}
.runway p{opacity:.85}
.pts{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;margin-top:2.5rem}
.pts h3{margin-bottom:.5rem}
.pts p{color:var(--mute);font-size:1rem}
pre{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:1.25rem;overflow-x:auto;font-size:.9rem;margin:1.5rem 0}
footer{border-top:1px solid var(--line);padding:2rem 0;color:var(--mute);font-size:.9rem}
@media(max-width:820px){.hero,.two,.runway,.pts{grid-template-columns:1fr}.runway{padding:2rem}section{padding:3.5rem 0}}

        .purse-landing { min-height: 100vh; background: var(--bg); color: var(--ink); }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: `<div class="wrap">
<nav><a class="logo" href="#top">Purse</a><a class="btn ghost" href="/app">Get started</a></nav>

<header class="hero" id="top">
<div>
<h1>Know what’s safe to spend today.</h1>
<p class="lead">Purse is the money copilot for students. Type your spending like a text, see what’s left after rent and bills, and catch subscriptions you forgot you pay for. Your data stays on your device.</p>
<div class="cta"><a class="btn" href="/app">Open App</a><a class="btn ghost" href="#envelopes">See how it works</a></div>
</div>
<div class="calc" aria-label="Safe to spend calculator">
<h3>Try it with your numbers</h3>
<div id="sliders"></div>
<div class="big"><span>You can spend about</span><strong id="out">$0</strong><span id="sub" style="color:var(--mute)"></span></div>
</div>
</header>
</div>

<section><div class="wrap two">
<div>
<h2>Just say what you spent.</h2>
<p class="lead">Paste a receipt, drop in a bank CSV or type it in plain words. Purse pulls out the merchant, amount, date and category in milliseconds, and flags anything it isn’t sure about so you can check it.</p>
<p class="lead">Ask things like “Can I afford a $120 dinner tonight?” and it weighs your payday, upcoming bills and envelopes before it answers.</p>
</div>
<div class="chat">
<div class="me">ramen with Sam, 14.50, yesterday</div>
<div class="bot">Logged as an expense. Check it looks right:
<div class="chips"><span>Ramen</span><span>−$14.50</span><span>Dining &amp; Nightlife</span><span>Yesterday</span><span>92% sure</span></div></div>
<div class="me">Can I afford a $120 dinner tonight?</div>
<div class="bot">Not comfortably. Rent leaves your account in 3 days and your Wants envelope has $62 left. A $45 dinner fits.</div>
</div>
</div></section>

<section id="envelopes"><div class="wrap">
<h2>Every dollar gets a job.</h2>
<p class="lead">Purse splits your money into three envelopes using the 50/30/20 rule. Each one shows live headroom, turns yellow at 80% and red when you overspend.</p>
<div class="env">
<div><div class="top"><h3>Needs · 50%</h3><small>Rent, groceries, utilities, transport, health</small></div><div class="bar"><i class="warn" style="width:82%"></i></div><small>$410 of $500 used. Nearly there.</small></div>
<div><div class="top"><h3>Wants · 30%</h3><small>Dining, entertainment, subscriptions, shopping</small></div><div class="bar"><i style="width:40%"></i></div><small>$120 of $300 used. Plenty of room.</small></div>
<div><div class="top"><h3>Savings and debt · 20%</h3><small>Emergency vault, index funds, retirement</small></div><div class="bar"><i style="width:100%"></i></div><small>$200 of $200 set aside this month.</small></div>
</div>
</div></section>

<section><div class="wrap">
<h2>Find the subscriptions quietly eating your loan.</h2>
<p class="lead">Purse spots overlapping services, price hikes and tools you haven’t opened in 30+ days. Tick the ones you’d cancel and watch the savings add up.</p>
<div class="list">
<label class="sub"><input type="checkbox" data-c="15.49"><span>Netflix Standard<span class="tag">overlaps</span><small>You also pay for the Hulu + Disney bundle</small></span><b>$15.49/mo</b></label>
<label class="sub"><input type="checkbox" data-c="12.99"><span>Hulu + Disney bundle<small>Active, watched this week</small></span><b>$12.99/mo</b></label>
<label class="sub"><input type="checkbox" data-c="54.99" checked><span>Adobe Creative Suite<span class="tag">unused 40 days</span><small>Last opened 40+ days ago</small></span><b>$54.99/mo</b></label>
</div>
<p class="total">You’d get back <b id="yr">$659.88</b> a year.</p>
</div></section>

<section><div class="wrap">
<div class="runway">
<div><div class="n">81 days</div></div>
<div><h2>How long could you last with no income?</h2><p class="lead" style="color:inherit">Purse adds up your checking and savings, ignores the fun stuff, and divides by your essentials. With $2,400 saved and $900 of essentials a month, that’s 2.7 months, or 81 days to find a new job or a new loan instalment.</p></div>
</div>
</div></section>

<section><div class="wrap two">
<div>
<h2>Purse asks before it changes anything.</h2>
<p class="lead">The AI can only propose. Every change waits for your yes, and every applied change can be undone in one click, with your balance restored to the cent. Bigger moves like editing bills or overriding a balance always need your approval.</p>
</div>
<div class="act">
<div class="flow" id="flow"><span id="s-Staged" class="on">Staged</span><span id="s-Applied">Applied</span><span id="s-Reverted">Reverted</span></div>
<b>Dinner with housemates: −$18.00</b>
<p style="color:var(--mute)">Balance: <b id="bal" style="color:var(--ink)">$640.00</b> · <span id="st">Waiting for you</span></p>
<div class="btns" id="btns"></div>
</div>
</div></section>

<section><div class="wrap">
<h2>Private by design.</h2>
<div class="pts">
<div><h3>On your device</h3><p>Transactions, budgets and chats are stored in your browser. There’s no analytics server and no remote ledger.</p></div>
<div><h3>Works offline</h3><p>Set up and review your money without a connection. Search runs locally in under 10 ms.</p></div>
<div><h3>Keys stay hidden</h3><p>Gemini is called through a server proxy, so secret keys never reach your browser. Prefer OpenAI, DeepSeek or Zhipu GLM? Bring your own key.</p></div>
</div>
<div class="pts" style="margin-top:3rem">
<div><h3>Meet Fiona</h3><p>A 3D companion who listens, talks back and lip-syncs, so checking your budget feels like chatting with a friend.</p></div>
<div><h3>It remembers</h3><p>Rules like “keep dining under $95 a week” live in a plain Markdown file you can read and edit.</p></div>
<div><h3>Open source</h3><p>MIT licensed and built for the 2026 Shenzhen International FinTech Competition.</p></div>
</div>
</div></section>

<footer><div class="wrap">Purse Autonomous Finance · MIT License · Made for the 2026 Shenzhen International FinTech Competition</div></footer>` }} />
    </div>
  );
};

export default LandingPage;
