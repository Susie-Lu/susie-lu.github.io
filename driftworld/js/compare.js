/*
  Grouped comparison cards: synchronized replay, carousel navigation, and autoplay-on-scroll.
*/
(function () {
  "use strict";

  function playVideo(video) {
    var p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () { /* autoplay blocked - ignore */ });
    }
  }

  function pauseVideos(container) {
    if (!container) return;
    container.querySelectorAll("video").forEach(function (video) {
      video.pause();
    });
  }

  /** Restart every <video> inside a container so they play together. */
  function replayParallel(container) {
    if (!container) return;
    container.querySelectorAll("video").forEach(function (video) {
      video.pause();
      video.currentTime = 0;
      playVideo(video);
    });
  }

  function setInteractiveState(container, enabled) {
    container.querySelectorAll("button, a, input, select, textarea, video").forEach(function (el) {
      if (enabled) {
        el.removeAttribute("tabindex");
      } else {
        el.setAttribute("tabindex", "-1");
      }
    });
  }

  function initCarousel(carousel) {
    var track = carousel.querySelector(".compare-carousel-track");
    var slides = Array.prototype.slice.call(carousel.querySelectorAll("[data-carousel-slide]"));
    var dots = Array.prototype.slice.call(carousel.querySelectorAll("[data-carousel-dot]"));
    var prev = carousel.querySelector("[data-carousel-prev]");
    var next = carousel.querySelector("[data-carousel-next]");
    var current = Math.max(0, slides.findIndex(function (slide) {
      return slide.classList.contains("is-active");
    }));

    if (!track || slides.length === 0) return;

    function showSlide(index, options) {
      var shouldReplay = !options || options.replay !== false;
      current = (index + slides.length) % slides.length;
      track.style.transform = "translateX(" + (-current * 100) + "%)";

      slides.forEach(function (slide, i) {
        var active = i === current;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
        setInteractiveState(slide, active);
        if (!active) pauseVideos(slide);
      });

      dots.forEach(function (dot, i) {
        var active = i === current;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-selected", active ? "true" : "false");
      });

      if (shouldReplay) replayParallel(slides[current]);
    }

    if (prev) {
      prev.addEventListener("click", function () {
        showSlide(current - 1);
      });
    }

    if (next) {
      next.addEventListener("click", function () {
        showSlide(current + 1);
      });
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        showSlide(i);
      });
    });

    carousel.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showSlide(current - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showSlide(current + 1);
      }
    });

    showSlide(current, { replay: false });
  }

  function setTabPanelInteractive(panel, enabled) {
    if (!panel) return;

    if (!enabled) {
      setInteractiveState(panel, false);
      return;
    }

    panel.querySelectorAll("button, a, input, select, textarea, video").forEach(function (el) {
      var slide = el.closest("[data-carousel-slide]");
      if (slide && !slide.classList.contains("is-active")) return;
      el.removeAttribute("tabindex");
    });
  }

  function replayActivePanel(panel) {
    var activeSlide = panel.querySelector("[data-carousel] .compare-slide.is-active");
    replayParallel(activeSlide || panel);
  }

  function initTabs(tabset) {
    var tabs = Array.prototype.slice.call(tabset.querySelectorAll("[role='tab'][data-tab-target]"));
    var panels = tabs.map(function (tab) {
      return document.getElementById(tab.dataset.tabTarget);
    });
    var current = Math.max(0, tabs.findIndex(function (tab) {
      return tab.classList.contains("is-active") || tab.getAttribute("aria-selected") === "true";
    }));

    if (tabs.length === 0 || panels.some(function (panel) { return !panel; })) return;

    function showTab(index, options) {
      var shouldReplay = !options || options.replay !== false;
      current = (index + tabs.length) % tabs.length;

      tabs.forEach(function (tab, i) {
        var active = i === current;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
        tab.setAttribute("tabindex", active ? "0" : "-1");
      });

      panels.forEach(function (panel, i) {
        var active = i === current;
        panel.classList.toggle("is-active", active);
        panel.setAttribute("aria-hidden", active ? "false" : "true");
        setTabPanelInteractive(panel, active);
        if (!active) pauseVideos(panel);
      });

      if (shouldReplay) replayActivePanel(panels[current]);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        showTab(i);
      });

      tab.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          showTab(current - 1);
          tabs[current].focus();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          showTab(current + 1);
          tabs[current].focus();
        } else if (event.key === "Home") {
          event.preventDefault();
          showTab(0);
          tabs[current].focus();
        } else if (event.key === "End") {
          event.preventDefault();
          showTab(tabs.length - 1);
          tabs[current].focus();
        }
      });
    });

    showTab(current, { replay: false });
  }
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".replay-btn[data-target]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        replayParallel(document.getElementById(btn.dataset.target));
      });
    });

    document.querySelectorAll("[data-carousel]").forEach(initCarousel);
    document.querySelectorAll("[data-tabs]").forEach(initTabs);

    if (!("IntersectionObserver" in window)) return;
    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        if (entry.target.matches("[data-carousel]")) {
          replayParallel(entry.target.querySelector(".compare-slide.is-active"));
        } else {
          replayParallel(entry.target);
        }

        obs.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    document.querySelectorAll(".compare-row").forEach(function (row) {
      if (!row.closest("[data-carousel]") && row.querySelector("video")) {
        observer.observe(row);
      }
    });

    document.querySelectorAll("[data-carousel]").forEach(function (carousel) {
      if (carousel.querySelector("video")) observer.observe(carousel);
    });
  });
})();
