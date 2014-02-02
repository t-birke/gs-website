
  var map;
  function initialize() {
    var mapOptions = {
      zoom: 15,
      center: new google.maps.LatLng(52.49531,13.36069)
    };
    map = new google.maps.Map(document.getElementById('map-canvas'),
        mapOptions);

    var marker = new google.maps.Marker({
      position: new google.maps.LatLng(52.49531,13.36069),
      map: map,
      title: 'Gentleman Studio'
    });
  }

  google.maps.event.addDomListener(window, 'load', initialize);

$(document).ready(function(){
  // Cache the Window object
  $window = $(window);
  // Position hat
  $("div[data-type='hat']").css({ top: ($window.height()*0.3) + 'px'});

  // popup
  var popupBackground = $("#popup-background");
  function showPopup(content, color){
    popupBackground.load("popups/" + content + ".html");
    popupBackground.css('background-color', color);
    popupBackground.removeClass("hidden");
    // lock scroll position, but retain settings for later
      var scrollPosition = self.pageYOffset || document.documentElement.scrollTop  || document.body.scrollTop
      ;
      var html = jQuery('html'); // it would make more sense to apply this to body, but IE7 won't have that
      html.data('scroll-position', scrollPosition);
      html.data('previous-overflow', html.css('overflow'));
      html.css('overflow', 'hidden');
      window.scrollTo(0, scrollPosition);
  }

  $(".reference-content a").click(function(){showPopup($(this).data("popup"),$(this).data("color"));});
  function closePopup(){
    popupBackground.addClass("hidden");
    // un-lock scroll position
    var html = jQuery('html');
    var scrollPosition = html.data('scroll-position');
    html.css('overflow', html.data('previous-overflow'));
    window.scrollTo(0, scrollPosition);
  }
  popupBackground.click(function(){closePopup($());});
  $(".popup").click(function(e){e.stopPropagation();});
  $(".close").click(function(){closePopup($());});

  // animation for arrow in service menu
  var arrowOffset = ($(".service-menu-container a:first")[0].offsetLeft) - 50;
  $(".service-menu-container a").mouseover(
      function(){
        $('.arrow').stop().animate({'left': (this.offsetLeft - 50) + 'px'}, 500);
    }).mouseout(
      function(){
        $('.arrow').stop().animate({'left': arrowOffset + 'px'}, 500);
    }).click(
      function(){
        arrowOffset = this.offsetLeft - 50;
        //hide all content elements
        $(".service-container").addClass("hidden");
        $(".service-menu-container a").removeClass("active");
        //show linked element
        $(".service-container[data-content='" + $(this).data('target') + "']").removeClass("hidden");
        $(this).addClass("active");
      });

  // animation for the quotes
  var currentQuote = 1;
  var quoteLength = $("div.quote-text-box").length;
  var prev = $(".quote-links a:nth-child(1)");
  var next = $(".quote-links a:nth-child(2)");
  
  function Forward(){
      $("div.quote-text-box[data-quote='" + currentQuote + "']").addClass("hidden");
      if(currentQuote == quoteLength-1)
        next.removeClass("active").css('cursor','default').off('click');
      currentQuote += 1;
      if(currentQuote == 2)
        prev.addClass("active").css('cursor','pointer').click(function(){Backward();});
      $("div.quote-text-box[data-quote='" + currentQuote + "']").removeClass("hidden");
    }

  function Backward(){
      $("div.quote-text-box[data-quote='" + currentQuote + "']").addClass("hidden");
      if(currentQuote == 2)
        prev.removeClass("active").css('cursor','default').off('click');
      currentQuote -= 1;
      if(currentQuote == quoteLength -1)
        next.addClass("active").css('cursor','pointer').click(function(){Forward();});
      $("div.quote-text-box[data-quote='" + currentQuote + "']").removeClass("hidden");
    }
  next.click(function(){Forward();});
  prev.click(function(){Backward();});



  //Parallax Effect
  $("div[data-type='logo'], section[data-type='background'], div[data-type='hat']").each(function(){
     var $bgobj = $(this); // assigning the object
                    
      $(window).scroll(function() {
                    
    // Scroll the background at var speed
    // the yPos is a negative value because we're scrolling it UP!                

    if($bgobj.data('type')=="background")
      {
        var yPos = (($window.scrollTop()-$bgobj.offset().top) / $bgobj.data('speed'))-200;
        var coords = '50% '+ yPos + 'px';
        $bgobj.css({ backgroundPosition: coords });
      }
    if($bgobj.data('type')=="logo")
      {
        var yPos = (($window.scrollTop() / $bgobj.data('speed')) + ($(window).height()*0.15)) + 'px';
        $bgobj.css({ top: (yPos)});
      }
    if($bgobj.data('type')=="hat")
    {
      var yPos = $window.height()*0.3 - $window.scrollTop()/2;
      
      if(yPos < 9.5)
        yPos = 12;
        // Put together our final background position
        var coords = yPos + 'px';
        var size = ((yPos / $window.height() * 150 ) + 50) + '%'

        // Move the background
        $bgobj.css({ top: coords });
        $bgobj.css({ height: size });
    }
    }); // window scroll Ends

     });  

    }); 
    /* 
     * Create HTML5 elements for IE's sake
     */

    document.createElement("section");