(function() {
  var initialize, map;

  initialize = function() {
    var map, mapOptions, marker;
    mapOptions = {
      zoom: 15,
      center: new google.maps.LatLng(52.49531, 13.36069)
    };
    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    return marker = new google.maps.Marker({
      position: new google.maps.LatLng(52.49531, 13.36069),
      map: map,
      title: "Gentleman Studio"
    });
  };

  map = void 0;

  google.maps.event.addDomListener(window, "load", initialize);

  $(document).ready(function() {
    var $window, Backward, Forward, arrowOffset, closePopup, currentQuote, highlightMenuItem, next, popupBackground, prev, quoteLength, scrollToAnchor, showPopup, t;
    $window = $(window);
    $("div[data-type='hat']").css({
      top: ($window.height() * 0.3) + "px"
    });
    popupBackground = $("#popup-background");
    showPopup = function(content, color) {
      var html, scrollPosition;
      popupBackground.load("popups/" + content + ".html");
      popupBackground.css("background-color", color);
      scrollPosition = self.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
      html = jQuery("html");
      html.data("scroll-position", scrollPosition);
      html.data("previous-overflow", html.css("overflow"));
      html.css("overflow", "hidden");
      return window.scrollTo(0, scrollPosition);
    };
    $(".reference-link-hover-content").not("[data-popup=none]").click(function() {
      console.log("click");
      showPopup($(this).data("popup"), $(this).data("color"));
      return popupBackground.removeClass("hidden");
    });
    popupBackground.click(function() {
      return closePopup($());
    });
    $(".popup").click(function(e) {
      return e.stopPropagation();
    });
    $(".close").click(function() {
      return closePopup($());
    });
    closePopup = function() {
      var html, scrollPosition;
      popupBackground.addClass("hidden");
      html = jQuery("html");
      scrollPosition = html.data("scroll-position");
      html.css("overflow", html.data("previous-overflow"));
      return window.scrollTo(0, scrollPosition);
    };
    highlightMenuItem = function(item) {
      $(".menu a").removeClass("active").removeClass("active-transition").addClass("inactive");
      return item.removeClass("inactive").addClass("active-transition").delay(500).queue(function(next) {
        item.removeClass("active-transition").addClass("active");
        return next();
      });
    };
    $(".menu a").click(function() {
      return highlightMenuItem($(this));
    });
    scrollToAnchor = function(aid) {
      var aTag;
      aTag = $("a[name='" + aid + "']");
      return $('html').animate({
        scrollTop: aTag.offset().top
      }, 2000);
    };
    $(".menu a").click(function() {
      var href;
      href = $(this).attr("href").replace('#', '');
      return scrollToAnchor(href);
    });
    $("section").waypoint({
      handler: function(direction) {
        var item;
        if (direction === "down") {
          return highlightMenuItem($(".menu a[href = '#" + $(this).attr("name") + "']"));
        } else {
          item = $(this).prev();
          if (item.attr("name") === $(this).attr("name")) {
            item = item.prev();
          }
          return highlightMenuItem($(".menu a[href = '#" + item.attr("name") + "']"));
        }
      },
      offset: "60px"
    });
    arrowOffset = ($(".service-menu-container a:first")[0].offsetLeft) - 40;
    $(".service-menu-container a").mouseover(function() {
      return $(".arrow").stop().animate({
        left: (this.offsetLeft - 40) + "px"
      }, 500);
    }).mouseout(function() {
      return $(".arrow").stop().animate({
        left: arrowOffset + "px"
      }, 500);
    }).click(function() {
      arrowOffset = this.offsetLeft - 40;
      $(".service-container").addClass("hidden");
      $(".service-menu-container a").removeClass("active");
      $(".service-container[data-content='" + $(this).data("target") + "']").removeClass("hidden");
      return $(this).addClass("active");
    });
    currentQuote = 1;
    quoteLength = $("div.quote-text-box").length;
    prev = $(".quote-links a:nth-child(1)");
    next = $(".quote-links a:nth-child(2)");
    Forward = function() {
      $("div.quote-text-box[data-quote='" + currentQuote + "']").addClass("hidden");
      if (currentQuote === quoteLength - 1) {
        next.removeClass("active").css("cursor", "default").off("click");
      }
      currentQuote += 1;
      if (currentQuote === 2) {
        prev.addClass("active").css("cursor", "pointer").click(function() {
          return Backward();
        });
      }
      return $("div.quote-text-box[data-quote='" + currentQuote + "']").removeClass("hidden");
    };
    Backward = function() {
      $("div.quote-text-box[data-quote='" + currentQuote + "']").addClass("hidden");
      if (currentQuote === 2) {
        prev.removeClass("active").css("cursor", "default").off("click");
      }
      currentQuote -= 1;
      if (currentQuote === quoteLength - 1) {
        next.addClass("active").css("cursor", "pointer").click(function() {
          return Forward();
        });
      }
      return $("div.quote-text-box[data-quote='" + currentQuote + "']").removeClass("hidden");
    };
    next.click(function() {
      return Forward();
    });
    prev.click(function() {
      return Backward();
    });
    t = $("a[name='stil']").offset().top;
    return $("div[data-type='logo'], section[data-type='background'], div[data-type='hat']").each(function() {
      var $bgobj;
      $bgobj = $(this);
      return $(window).scroll(function() {
        var coords, size, yPos;
        if ($bgobj.data("type") === "background") {
          yPos = (($window.scrollTop() - $bgobj.offset().top) / $bgobj.data("speed")) - 200;
          coords = "50% " + yPos + "px";
          $bgobj.css({
            backgroundPosition: coords
          });
        }
        if ($bgobj.data("type") === "logo") {
          yPos = (($window.scrollTop() / $bgobj.data("speed")) + ($(window).height() * 0.15)) + "px";
          $bgobj.css({
            top: yPos
          });
        }
        if ($bgobj.data("type") === "hat") {
          yPos = $window.height() * 0.3 - $window.scrollTop() / 2;
          if (yPos < 9.5) {
            yPos = 12;
          }
          coords = yPos + "px";
          size = ((yPos / $window.height() * 150) + 50) + "%";
          $bgobj.css({
            top: coords
          });
          return $bgobj.css({
            height: size
          });
        }
      });
    });
  });

  document.createElement("section");

}).call(this);
