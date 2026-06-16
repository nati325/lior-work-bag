(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  function encodePath(path) {
    return path.split("/").map(function (part) {
      return encodeURIComponent(part);
    }).join("/");
  }

  function flattenCompanies(companies) {
    var flat = [];
    companies.forEach(function (company) {
      company.items.forEach(function (item) {
        flat.push({
          file: item.file,
          type: item.type,
          company: company.name,
          label: company.name + " – " + item.label.replace(/^[^–]+–\s*/, "")
        });
      });
    });
    return flat;
  }

  function createMediaElement(item) {
    var src = encodePath(item.file);

    if (item.type === "video") {
      var video = document.createElement("video");
      video.controls = true;
      video.preload = "metadata";
      video.setAttribute("playsinline", "");
      video.className = "carousel-zoomable";
      video.setAttribute("aria-label", item.label + " – לחצו להגדלה או על כפתור ההפעלה כדי לצפות");
      video.src = src;
      return video;
    }

    var img = document.createElement("img");
    img.src = src;
    img.alt = item.label;
    img.loading = "lazy";
    img.decoding = "async";
    img.className = "carousel-zoomable";
    img.setAttribute("role", "button");
    img.tabIndex = 0;
    img.setAttribute("aria-label", "הגדל תמונה: " + item.label);
    return img;
  }

  var MediaLightbox = {
    dialog: null,
    content: null,
    caption: null,
    lastFocus: null,

    ensure: function () {
      if (this.dialog) {
        return;
      }

      var self = this;
      var dialog = document.createElement("dialog");
      dialog.className = "media-lightbox";
      dialog.setAttribute("aria-label", "תצוגה מוגדלת");

      dialog.innerHTML =
        "<div class=\"media-lightbox-inner\">" +
        "<button type=\"button\" class=\"media-lightbox-close\" aria-label=\"סגור\">" +
        "<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\">" +
        "<path d=\"M6 6l12 12M18 6L6 18\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>" +
        "</svg></button>" +
        "<div class=\"media-lightbox-content\"></div>" +
        "<p class=\"media-lightbox-caption\"></p>" +
        "</div>";

      document.body.appendChild(dialog);

      this.dialog = dialog;
      this.content = dialog.querySelector(".media-lightbox-content");
      this.caption = dialog.querySelector(".media-lightbox-caption");

      dialog.querySelector(".media-lightbox-close").addEventListener("click", function () {
        self.close();
      });

      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) {
          self.close();
        }
      });

      dialog.addEventListener("cancel", function (event) {
        event.preventDefault();
        self.close();
      });
    },

    open: function (item, trigger) {
      this.ensure();
      this.lastFocus = trigger || document.activeElement;
      this.content.innerHTML = "";

      var src = encodePath(item.file);

      if (item.type === "video") {
        var video = document.createElement("video");
        video.controls = true;
        video.autoplay = true;
        video.preload = "auto";
        video.setAttribute("playsinline", "");
        video.className = "media-lightbox-media";
        video.setAttribute("aria-label", item.label);
        video.src = src;
        this.content.appendChild(video);
      } else {
        var img = document.createElement("img");
        img.src = src;
        img.alt = item.label;
        img.className = "media-lightbox-media";
        img.decoding = "async";
        this.content.appendChild(img);
      }

      this.caption.textContent = item.label;
      this.dialog.showModal();
      this.dialog.querySelector(".media-lightbox-close").focus();
    },

    close: function () {
      if (!this.dialog || !this.dialog.open) {
        return;
      }

      var video = this.content.querySelector("video");
      if (video) {
        video.pause();
      }

      this.dialog.close();
      this.content.innerHTML = "";

      if (this.lastFocus && typeof this.lastFocus.focus === "function") {
        this.lastFocus.focus();
      }
    }
  };

  function bindMediaZoom(element, item) {
    function openLightbox(event) {
      if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") {
        return;
      }

      if (element.tagName === "VIDEO") {
        var rect = element.getBoundingClientRect();
        var controlsZone = 52;

        if (event.clientY > rect.bottom - controlsZone) {
          return;
        }
      }

      if (event.type === "keydown") {
        event.preventDefault();
      }

      MediaLightbox.open(item, element);
    }

    element.addEventListener("click", openLightbox);

    if (element.tagName === "IMG") {
      element.addEventListener("keydown", openLightbox);
    }
  }

  function AccessibleCarousel(container, options) {
    this.container = container;
    this.items = options.items;
    this.title = options.title;
    this.showCompany = !!options.showCompany;
    this.currentIndex = 0;
    this.touchStartX = 0;
    this.build();
    this.bind();
    this.showSlide(0);
  }

  function carouselArrowIcon(direction) {
    var path = direction === "next"
      ? "M14 6l-6 6 6 6"
      : "M10 6l6 6-6 6";

    return (
      "<svg class=\"carousel-arrow-icon\" width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\">" +
      "<path d=\"" + path + "\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>" +
      "</svg>"
    );
  }

  AccessibleCarousel.prototype.build = function () {
    var self = this;

    var region = document.createElement("div");
    region.className = "carousel";
    region.setAttribute("role", "region");
    region.setAttribute("aria-roledescription", "קרוסלה");
    region.setAttribute("aria-label", this.title);

    var frame = document.createElement("div");
    frame.className = "carousel-frame";

    this.prevBtn = document.createElement("button");
    this.prevBtn.type = "button";
    this.prevBtn.className = "carousel-arrow carousel-arrow-prev";
    this.prevBtn.setAttribute("aria-label", "הקודם");
    this.prevBtn.innerHTML = carouselArrowIcon("prev");

    var viewport = document.createElement("div");
    viewport.className = "carousel-viewport";
    viewport.tabIndex = 0;
    this.viewport = viewport;

    this.nextBtn = document.createElement("button");
    this.nextBtn.type = "button";
    this.nextBtn.className = "carousel-arrow carousel-arrow-next";
    this.nextBtn.setAttribute("aria-label", "הבא");
    this.nextBtn.innerHTML = carouselArrowIcon("next");

    this.slides = this.items.map(function (item, index) {
      var slide = document.createElement("div");
      slide.className = "carousel-slide";
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "שקף");
      slide.setAttribute("aria-label", (index + 1) + " מתוך " + self.items.length + ": " + item.label);
      slide.hidden = index !== 0;

      var mediaWrap = document.createElement("div");
      mediaWrap.className = "carousel-media";

      var badge = document.createElement("span");
      badge.className = "carousel-badge";
      badge.textContent = item.type === "video" ? "סרטון" : "תמונה";
      mediaWrap.appendChild(badge);
      var mediaEl = createMediaElement(item);
      bindMediaZoom(mediaEl, item);
      mediaWrap.appendChild(mediaEl);
      slide.appendChild(mediaWrap);
      viewport.appendChild(slide);
      return slide;
    });

    frame.appendChild(this.prevBtn);
    frame.appendChild(viewport);
    frame.appendChild(this.nextBtn);
    region.appendChild(frame);

    var panel = document.createElement("div");
    panel.className = "carousel-panel";

    var footer = document.createElement("div");
    footer.className = "carousel-footer";

    this.captionEl = document.createElement("p");
    this.captionEl.className = "carousel-caption";

    this.statusEl = document.createElement("p");
    this.statusEl.className = "carousel-status";
    this.statusEl.setAttribute("aria-live", "polite");

    footer.appendChild(this.captionEl);
    footer.appendChild(this.statusEl);
    panel.appendChild(footer);

    var progress = document.createElement("div");
    progress.className = "carousel-progress";
    progress.setAttribute("aria-hidden", "true");

    this.progressBar = document.createElement("span");
    this.progressBar.className = "carousel-progress-bar";
    progress.appendChild(this.progressBar);
    panel.appendChild(progress);

    region.appendChild(panel);
    this.container.appendChild(region);
  };

  AccessibleCarousel.prototype.bind = function () {
    var self = this;

    this.prevBtn.addEventListener("click", function () {
      self.go(-1);
    });

    this.nextBtn.addEventListener("click", function () {
      self.go(1);
    });

    this.viewport.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        self.go(-1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        self.go(1);
      }
    });

    this.viewport.addEventListener("touchstart", function (event) {
      self.touchStartX = event.changedTouches[0].screenX;
    }, { passive: true });

    this.viewport.addEventListener("touchend", function (event) {
      var diff = event.changedTouches[0].screenX - self.touchStartX;
      if (Math.abs(diff) < 35) {
        return;
      }
      self.go(diff > 0 ? -1 : 1);
    }, { passive: true });
  };

  AccessibleCarousel.prototype.pauseVideos = function () {
    this.slides.forEach(function (slide) {
      var video = slide.querySelector("video");
      if (video && !video.paused) {
        video.pause();
      }
    });
  };

  AccessibleCarousel.prototype.updateFooter = function (index) {
    var item = this.items[index];
    var total = this.items.length;

    if (this.showCompany && item.company) {
      this.captionEl.textContent = item.company;
    } else {
      this.captionEl.textContent = item.label;
    }

    this.statusEl.textContent = (index + 1) + " / " + total;
    this.progressBar.style.width = ((index + 1) / total * 100) + "%";
  };

  AccessibleCarousel.prototype.showSlide = function (index) {
    this.pauseVideos();
    this.currentIndex = index;

    this.slides.forEach(function (slide, i) {
      slide.hidden = i !== index;
    });

    this.updateFooter(index);
    this.prevBtn.disabled = this.items.length <= 1;
    this.nextBtn.disabled = this.items.length <= 1;
  };

  AccessibleCarousel.prototype.go = function (direction) {
    var total = this.items.length;
    if (total <= 1) {
      return;
    }
    var next = (this.currentIndex + direction + total) % total;
    this.showSlide(next);
  };

  function initCarousels() {
    if (!window.MEDIA_DATA) {
      return;
    }

    var companiesRoot = document.getElementById("companies-carousel");
    var socialRoot = document.getElementById("social-carousel");
    var sketchesRoot = document.getElementById("sketches-carousel");
    var allCompanies = flattenCompanies(window.MEDIA_DATA.companies);

    if (companiesRoot && allCompanies.length > 0) {
      new AccessibleCarousel(companiesRoot, {
        title: "עבודות עם חברות",
        items: allCompanies,
        showCompany: true
      });
    }

    if (socialRoot && window.MEDIA_DATA.social.length > 0) {
      new AccessibleCarousel(socialRoot, {
        title: "סושיאל",
        items: window.MEDIA_DATA.social,
        showCompany: false
      });
    }

    if (sketchesRoot && window.MEDIA_DATA.sketches && window.MEDIA_DATA.sketches.length > 0) {
      new AccessibleCarousel(sketchesRoot, {
        title: "סקיצות",
        items: window.MEDIA_DATA.sketches,
        showCompany: false
      });
    }
  }

  function initNavHighlight() {
    var navLinks = document.querySelectorAll(".site-nav-list a[data-section]");
    if (!navLinks.length) {
      return;
    }

    var sections = [];
    navLinks.forEach(function (link) {
      var section = document.getElementById(link.getAttribute("data-section"));
      if (section) {
        sections.push({ id: section.id, link: link });
      }
    });

    if (!sections.length) {
      return;
    }

    function setActive(id) {
      navLinks.forEach(function (link) {
        var isActive = link.getAttribute("data-section") === id;
        link.classList.toggle("is-active", isActive);
        if (isActive) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        var visible = entries
          .filter(function (entry) { return entry.isIntersecting; })
          .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });

        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      }, {
        root: null,
        rootMargin: "-45% 0px -45% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1]
      });

      sections.forEach(function (item) {
        observer.observe(document.getElementById(item.id));
      });
    }
  }

  function init() {
    initCarousels();
    initNavHighlight();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
