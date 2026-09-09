(function () {
  "use strict";

  const data = window.__BRAND__ || {};
  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  /* ---------- Nav: solidify on scroll ---------- */
  function initNav() {
    const nav = $("[data-nav]");
    if (!nav) return;
    const on = () => nav.classList.toggle("is-scrolled", scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
  }

  /* ---------- Mobile nav ---------- */
  function initMobileNav() {
    const toggle = $("[data-nav-toggle]");
    const close = $("[data-nav-close]");
    const panel = $("[data-mobile-nav]");
    if (!toggle || !panel) return;

    function open() {
      panel.dataset.open = "true";
      panel.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }
    function shut() {
      panel.dataset.open = "false";
      panel.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }
    toggle.addEventListener("click", open);
    if (close) close.addEventListener("click", shut);
    $$("a", panel).forEach(a => a.addEventListener("click", shut));
    window.addEventListener("keydown", e => { if (e.key === "Escape") shut(); });
  }

  /* ---------- Smooth anchor scrolling (native, nav offset) ---------- */
  function initSmoothAnchors() {
    document.addEventListener("click", e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const navH = 92;
      window.scrollTo({
        top: el.getBoundingClientRect().top + scrollY - navH + 1,
        behavior: reduced ? "auto" : "smooth",
      });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  function initMagnetic() {
    if (!fineHover) return;
    $$("[data-magnetic]").forEach(el => {
      const strength = parseFloat(el.dataset.magneticStrength || "0.25");
      const inner = document.createElement("span");
      inner.className = "magnetic-inner";
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
      el.classList.add("has-magnetic");
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      el.addEventListener("mousemove", e => {
        const r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) - r.width / 2) * strength;
        ty = ((e.clientY - r.top) - r.height / 2) * strength;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      el.addEventListener("mouseleave", () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
      function loop() {
        cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
        inner.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
        raf = (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) ? requestAnimationFrame(loop) : null;
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveals() {
    const els = $$("[data-reveal]");
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("is-revealed");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
    els.forEach(el => io.observe(el));

    setTimeout(() => {
      $$("[data-reveal]:not(.is-revealed)").forEach(el => {
        if (el.getBoundingClientRect().top < innerHeight) el.classList.add("is-revealed");
      });
    }, 6000);
  }

  /* ---------- Count-up stats ---------- */
  function initCountUp() {
    $$("[data-count-to]").forEach(el => {
      const target = parseFloat(el.dataset.countTo);
      const trigger = () => {
        if (window.gsap) {
          const obj = { v: 0 };
          gsap.to(obj, {
            v: target, duration: 1.2, ease: "power2.out",
            onUpdate: () => { el.textContent = Math.round(obj.v); },
          });
        } else {
          el.textContent = target;
        }
      };
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { trigger(); io.unobserve(e.target); } });
      }, { threshold: 0.4 });
      io.observe(el);
    });
  }

  /* ---------- Reviews marquee (infinite auto-scroll, pause on hover) ---------- */
  function initReviewsMarquee() {
    const wrap = $("[data-reviews-wrap]");
    const track = $("[data-reviews-track]");
    if (!wrap || !track || !window.gsap) return; // static single row (still fully readable) if GSAP failed to load

    const clone = track.cloneNode(true);
    clone.removeAttribute("data-reviews-track");
    clone.setAttribute("aria-hidden", "true");
    track.parentNode.appendChild(clone);

    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || "22");
    const distance = track.scrollWidth + gap;
    const speed = 44; // px/sec — slow, continuous
    const tween = gsap.to([track, clone], {
      x: -distance, duration: distance / speed, ease: "none", repeat: -1,
      modifiers: { x: gsap.utils.unitize(x => parseFloat(x) % distance) },
    });

    wrap.addEventListener("mouseenter", () => tween.pause());
    wrap.addEventListener("mouseleave", () => tween.play());
    wrap.addEventListener("focusin", () => tween.pause());
    wrap.addEventListener("focusout", () => tween.play());
  }

  /* ---------- FAQ accordion ---------- */
  function initFaq() {
    $$("[data-faq-toggle]").forEach(btn => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".faq-item");
        if (!item) return;
        const isOpen = item.classList.contains("is-open");
        item.classList.toggle("is-open", !isOpen);
        btn.setAttribute("aria-expanded", String(!isOpen));
      });
    });
  }

  /* ---------- Contact form (mailto fallback, zero backend) ---------- */
  function initContactForm() {
    const form = $("[data-contact-form]");
    const success = $("[data-contact-success]");
    if (!form) return;

    form.addEventListener("submit", e => {
      e.preventDefault();
      if (form.classList.contains("is-sending")) return;
      if (!form.reportValidity()) return;

      form.classList.add("is-sending");

      const name = form.elements.name.value.trim();
      const clinic = form.elements.clinic.value.trim();
      const email = form.elements.email.value.trim();
      const phone = form.elements.phone.value.trim();
      const message = form.elements.message.value.trim();
      const to = (data.contactEmail || "andres@noventia.tech");

      const subject = `Reserva de llamada — ${clinic || name}`;
      const bodyLines = [
        `Nombre: ${name}`,
        `Clínica: ${clinic}`,
        `Email: ${email}`,
        phone ? `Teléfono: ${phone}` : null,
        message ? `\nMensaje:\n${message}` : null,
      ].filter(Boolean);
      const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

      setTimeout(() => {
        window.location.href = mailto;
        form.classList.remove("is-sending");
        form.classList.add("is-sent");
        if (success) success.classList.add("is-visible");
        if (success) success.setAttribute("aria-hidden", "false");
      }, 500);
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    safe(initNav, "initNav");
    safe(initMobileNav, "initMobileNav");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(initMagnetic, "initMagnetic");
    safe(initReveals, "initReveals");
    safe(initCountUp, "initCountUp");
    safe(initReviewsMarquee, "initReviewsMarquee");
    safe(initFaq, "initFaq");
    safe(initContactForm, "initContactForm");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
