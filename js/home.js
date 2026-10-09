// Homepage only: EN/NL copy, sample report tabs, and the live report card in the hero.
(function () {
  var NL = {
    nav_home: "Home", nav_about: "Over ons", nav_how: "Hoe het werkt", nav_contact: "Contact",
    nav_login: "Inloggen", nav_cta: "Plan een gesprek",
    hero_eyebrow: "Contractanalyse voor advocatenkantoren",
    hero_l1: "De eerste lezing", hero_l2: "van elk contract,", hero_l3: "<em>binnen drie minuten.</em>",
    hero_sub: "Upload een pdf. Loop &amp; Convert levert een gestructureerd risicorapport met een risicoscore, de belangrijkste bepalingen, red flags en de vragen die u de wederpartij stelt. Uw advocaten controleren het resultaat in plaats van het zelf te maken.",
    hero_cta1: "Test het op een contract dat u kent", hero_cta2: "Bekijk het voorbeeldrapport",
    hero_note: "Stuur een contract dat u al heeft beoordeeld. Wij sturen het rapport terug. U controleert ons werk.",
    card_risk: "Hoog risico", card_f1: "Indexatieminimum van 3% per jaar", card_f2: "Aansprakelijkheid voor verborgen gebreken uitgesloten",
    card_f3: "Stilzwijgende verlenging, 12 maanden opzegging", card_foot1: "14 pagina's &middot; 11 kernbepalingen", card_foot2: "Voorbeeld",
    fact1: "van upload tot afgerond rapport", fact2: "documenten worden verwerkt in de Europese Unie", fact3: "contracten van cli&euml;nten gebruikt om AI-modellen te trainen",
    rep_eyebrow: "Voorbeeldrapport", rep_title: "Dit verschijnt in uw dashboard.",
    rep_sub: "Een illustratie van het rapportformaat, op basis van een fictief huurcontract voor kantoorruimte. Elk rapport heeft dezelfde vier onderdelen, zodat uw advocaten altijd weten waar ze moeten kijken.",
    rep_meta: "14 pagina's &middot; geanalyseerd in 2 min 41 s &middot; risicoscore 72/100", rep_badge: "Hoog risico",
    tab1: "Risicosamenvatting", tab2: "Kernbepalingen", tab3: "Red flags", tab4: "Vragen",
    p_sum: "<li>De huurindexatie kent een jaarlijkse ondergrens van 3%, waardoor de huur ook stijgt als de inflatie lager is.</li><li>Groot onderhoud wordt bij de huurder gelegd, in afwijking van de ROZ algemene bepalingen.</li><li>De verhuurder sluit aansprakelijkheid voor gebreken uit, ook voor verborgen gebreken.</li><li>De huur wordt stilzwijgend met vijf jaar verlengd, tenzij twaalf maanden vooraf wordt opgezegd.</li>",
    p_cl: "<div class=\"clause\"><h4>Duur en verlenging</h4><span class=\"ref\">art. 3</span><p>Vijf jaar vanaf 1 januari 2027, daarna verlenging met vijf jaar. Opzegtermijn twaalf maanden.</p></div><div class=\"clause\"><h4>Huurprijs en indexatie</h4><span class=\"ref\">art. 4</span><p>&euro; 84.000 per jaar excl. btw, jaarlijks ge&iuml;ndexeerd op basis van de CPI met een minimum van 3%.</p></div><div class=\"clause\"><h4>Zekerheid</h4><span class=\"ref\">art. 6</span><p>Bankgarantie ter hoogte van zes maanden huur, opeisbaar op eerste verzoek.</p></div><div class=\"clause\"><h4>Onderhoud</h4><span class=\"ref\">art. 9</span><p>Huurder draagt al het onderhoud, inclusief groot onderhoud aan de constructie.</p></div><div class=\"clause\"><h4>Onderverhuur</h4><span class=\"ref\">art. 11</span><p>Niet toegestaan zonder voorafgaande schriftelijke toestemming. Geen redelijkheidsmaatstaf voor een weigering.</p></div>",
    p_rf: "<div class=\"rf\"><span class=\"badge\">Hoog</span><p>Indexatieminimum van 3% (art. 4.2) legt het inflatierisico volledig bij de huurder.</p></div><div class=\"rf\"><span class=\"badge\">Hoog</span><p>Verhuurder sluit aansprakelijkheid voor verborgen gebreken uit (art. 8.4). Toets aan art. 7:209 BW.</p></div><div class=\"rf\"><span class=\"badge med\">Middel</span><p>Groot onderhoud ligt bij de huurder (art. 9.1), in afwijking van de ROZ-standaard.</p></div><div class=\"rf\"><span class=\"badge med\">Middel</span><p>Een opzegtermijn van twaalf maanden v&oacute;&oacute;r stilzwijgende verlenging (art. 3.2) wordt snel gemist.</p></div>",
    p_q: "<li>Accepteert de verhuurder een plafond op de CPI-indexatie in plaats van een minimum van 3%, of het schrappen van dat minimum?</li><li>Kan groot onderhoud terug naar de verhuurder, zoals in de ROZ algemene bepalingen?</li><li>Is de verhuurder bereid op te nemen dat toestemming voor onderverhuur niet op onredelijke gronden wordt geweigerd?</li>",
    rep_note: "Illustratie. Fictief contract; namen, bedragen en artikelnummers zijn voor dit voorbeeld verzonnen.",
    how_eyebrow: "Hoe het werkt", how_title: "Drie stappen. De advocaat houdt de regie.",
    how_sub: "Loop &amp; Convert doet de eerste lezing. Het oordeel en het advies blijven bij uw advocaten.",
    s1_h: "Upload de pdf", s1_p: "Huurovereenkomsten, geheimhoudingsovereenkomsten, dienstverleningsovereenkomsten, arbeidsovereenkomsten, aandeelhoudersovereenkomsten.",
    s2_h: "De AI leest elke bepaling", s2_p: "Het systeem bepaalt de risicoscore, haalt de belangrijke bepalingen eruit en markeert alles wat eenzijdig of ongebruikelijk is.",
    s3_h: "Uw advocaat controleert", s3_p: "Het rapport is een eerste lezing. Uw advocaat controleert het en adviseert de cli&euml;nt. Elk rapport blijft bewaard in het dashboard van uw kantoor.",
    sec_eyebrow: "Beveiliging", sec_title: "De documenten van uw cli&euml;nt blijven van uw cli&euml;nt.",
    sec_sub: "Gegevensbeveiliging is de eerste vraag die elk kantoor stelt. Dit zijn de antwoorden.",
    sec1_h: "Verwerkt in de EU", sec1_p: "Contracten worden verwerkt binnen de Europese Unie.",
    sec2_h: "Nooit gebruikt voor training", sec2_p: "Uw documenten worden niet gebruikt om AI-modellen te trainen, niet de onze en niet die van anderen.",
    sec3_h: "Gescheiden per kantoor", sec3_p: "Elk kantoor heeft een eigen omgeving. Advocaten zien de contracten van hun eigen kantoor en verder niets.",
    sec4_h: "Verwerkersovereenkomst", sec4_p: "Voordat een pilot start, tekenen we een verwerkersovereenkomst.",
    pil_eyebrow: "Pilot", pil_title: "Controleer ons werk voordat u iets betaalt.",
    pil_sub: "Twee stappen, geen langlopend contract. Na elke stap beslist u zelf.",
    o1_tag: "Stap 1 &middot; Gratis", o1_h: "Beoordeel ons huiswerk",
    o1_p: "Stuur een contract of model dat uw kantoor al heeft beoordeeld. Wij analyseren het en sturen het rapport terug. U vergelijkt het met uw eigen beoordeling. Geen account en niets te tekenen.",
    o2_tag: "Eerste 30 dagen gratis proefperiode", o2_h: "Maandabonnement voor uw kantoor",
    o2_p: "Onbeperkt analyses voor maximaal 10 advocaten, inclusief onboarding. De eerste 30 dagen zijn gratis, daarna &euro; 500 per maand.",
    o2_more: "Meer dan 10 advocaten? De prijs spreken we samen af in een gesprek.",
    pil_note: "U kunt niet online afrekenen. Mail ons dat u interesse heeft en wanneer u tijd heeft voor een gesprek van 15 minuten.",
    o2_small: "per maand, excl. btw, tot 10 advocaten", pil_cta: "Mail ons uw interesse",
    founder_q: "Ik laat u het product liever zien op uw eigen contract dan dat ik het op een website beschrijf. Bel me gerust direct.",
    founder_role: "Oprichter, Loop &amp; Convert, Zaandam",
    final_h: "Stuur ons &eacute;&eacute;n contract dat u goed kent.",
    final_p: "U krijgt het rapport terug en beoordeelt het tegen uw eigen review. Is het niet nuttig, dan bent u tien minuten kwijt.",
    final_cta: "Plan een gesprek",
    foot_tag: "AI-contractanalyse voor advocatenkantoren. Volledige analyse binnen 3 minuten.",
    foot_company: "Bedrijf", foot_product: "Product", foot_start: "Aan de slag",
    foot_rights: "Alle rechten voorbehouden.", foot_line: "AI-contractanalyse voor vooruitstrevende advocatenkantoren.",
    foot_terms: "Algemene voorwaarden", foot_priv: "Privacybeleid"
  };
  var STATUS = { en: ["Reading clauses", "Report ready"], nl: ["Bepalingen lezen", "Rapport klaar"] };
  var EN = {};
  var nodes = document.querySelectorAll("[data-i18n]");
  nodes.forEach(function (el) { EN[el.dataset.i18n] = el.innerHTML; });
  var lang = "en";
  var statusEl = document.getElementById("status");
  var statusTxt = document.getElementById("status-txt");

  function setLang(l) {
    lang = l;
    var dict = l === "nl" ? NL : EN;
    nodes.forEach(function (el) { var v = dict[el.dataset.i18n]; if (v != null) el.innerHTML = v; });
    document.documentElement.lang = l;
    document.querySelectorAll(".lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === l)); });
    if (statusEl && statusTxt) statusTxt.textContent = STATUS[l][statusEl.classList.contains("busy") ? 0 : 1];
    try { localStorage.setItem("lc-lang", l); } catch (e) {}
  }
  document.querySelectorAll(".lang button").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.dataset.lang); });
  });
  var saved = null;
  try { saved = localStorage.getItem("lc-lang"); } catch (e) {}
  if (saved === "nl" || (!saved && /^nl/i.test(navigator.language || ""))) setLang("nl");

  /* Report tabs */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  function select(t) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute("aria-selected", String(on));
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(t); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      var n = tabs[(i + d + tabs.length) % tabs.length]; select(n); n.focus();
    });
  });

  /* Hero: the report builds itself, then loops */
  var card = document.getElementById("card");
  if (!card) return;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = 213.6, TARGET = 72;
  var ring = document.getElementById("ring"), score = document.getElementById("score");
  var scan = document.getElementById("scan");
  var hits = document.querySelectorAll(".dl.hit"), flags = document.querySelectorAll(".flag");
  var timers = [];
  function setScore(v) { score.textContent = Math.round(v); ring.style.strokeDashoffset = C * (1 - v / 100); }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function play() {
    timers.forEach(clearTimeout); timers = [];
    if (document.hidden) { later(play, 2000); return; }
    hits.forEach(function (h) { h.classList.remove("on"); });
    flags.forEach(function (f) { f.classList.remove("on"); });
    setScore(0);
    statusEl.classList.add("busy"); statusTxt.textContent = STATUS[lang][0];
    scan.classList.remove("go"); void scan.offsetWidth; scan.classList.add("go");
    [[2, 650], [0, 1250], [1, 1800]].forEach(function (p) {
      later(function () {
        document.querySelector('.dl.hit[data-hit="' + p[0] + '"]').classList.add("on");
        document.querySelector('.flag[data-flag="' + p[0] + '"]').classList.add("on");
      }, p[1]);
    });
    var t0 = performance.now();
    (function tick(now) {
      var k = Math.min(1, (now - t0) / 2500), e = 1 - Math.pow(1 - k, 3);
      setScore(TARGET * e);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
    later(function () { statusEl.classList.remove("busy"); statusTxt.textContent = STATUS[lang][1]; }, 2700);
    later(play, 9500);
  }
  if (!reduced) later(play, 900);

  /* Gentle tilt on the hero card for mouse users */
  if (!reduced && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var stage = card.parentElement;
    stage.addEventListener("mousemove", function (e) {
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = "rotateY(" + (x * 5) + "deg) rotateX(" + (-y * 4) + "deg)";
    });
    stage.addEventListener("mouseleave", function () { card.style.transform = ""; });
  }
})();
