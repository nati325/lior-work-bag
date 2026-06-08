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
      video.setAttribute("aria-label", item.label + " – לחצו על כפתור ההפעלה כדי לצפות");
      video.src = src;
      return video;
    }

    var img = document.createElement("img");
    img.src = src;
    img.alt = item.label;
    img.loading = "lazy";
    img.decoding = "async";
    return img;
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
    this.prevBtn.innerHTML = "<span class=\"arrow-label\">הקודם</span>";

    var viewport = document.createElement("div");
    viewport.className = "carousel-viewport";
    viewport.tabIndex = 0;
    this.viewport = viewport;

    this.nextBtn = document.createElement("button");
    this.nextBtn.type = "button";
    this.nextBtn.className = "carousel-arrow carousel-arrow-next";
    this.nextBtn.setAttribute("aria-label", "הבא");
    this.nextBtn.innerHTML = "<span class=\"arrow-label\">הבא</span>";

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
      mediaWrap.appendChild(createMediaElement(item));
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
      if (Math.abs(diff) < 50) {
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCarousels);
  } else {
    initCarousels();
  }
})();
