initialize = ->
  mapOptions =
    zoom: 15
    center: new google.maps.LatLng(52.49531, 13.36069)

  map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions)
  marker = new google.maps.Marker(
    position: new google.maps.LatLng(52.49531, 13.36069)
    map: map
    title: "Gentleman Studio"
  )
map = undefined
google.maps.event.addDomListener window, "load", initialize
$(document).ready ->
  
  # Cache the Window object
  $window = $(window)
  
  # Position hat
  $("div[data-type='hat']").css top: ($window.height() * 0.3) + "px"

  # Reference popup
  popupBackground = $("#popup-background")
  showPopup = (content, color) ->
    popupBackground.load "popups/" + content + ".html"
    popupBackground.css "background-color", color
    # lock scroll position, but retain settings for later
    scrollPosition = self.pageYOffset or document.documentElement.scrollTop or document.body.scrollTop
    html = jQuery("html") # it would make more sense to apply this to body, but IE7 won't have that
    html.data "scroll-position", scrollPosition
    html.data "previous-overflow", html.css("overflow")
    html.css "overflow", "hidden"
    window.scrollTo 0, scrollPosition

  $(".reference-link-hover-content").not("[data-popup=none]").click ->
    console.log "click"
    showPopup $(this).data("popup"), $(this).data("color")
    popupBackground.removeClass "hidden"

  popupBackground.click ->
    closePopup $()

  $(".popup").click (e) ->
    e.stopPropagation()

  $(".close").click ->
    closePopup $()

  closePopup = ->
    popupBackground.addClass "hidden"
    
    # un-lock scroll position
    html = jQuery("html")
    scrollPosition = html.data("scroll-position")
    html.css "overflow", html.data("previous-overflow")
    window.scrollTo 0, scrollPosition
  
  highlightMenuItem = (item) ->
    # remove all active classes
    $(".menu a").removeClass("active").removeClass("active-transition").addClass("inactive")
    # add active class to clicked link
    item.removeClass("inactive").addClass("active-transition").delay( 500 ).queue (next) ->
      item.removeClass("active-transition").addClass("active")
      next()
  
  # animation of top menu items
  $(".menu a").click ->
    highlightMenuItem $(this)

  # gracefull scrolling
  scrollToAnchor = (aid) ->
    aTag = $("a[name='" + aid + "']")
    $('html').animate
      scrollTop: aTag.offset().top
      ,2000
  
  $(".menu a").click ->
    href = $(this).attr("href").replace('#', '')
    scrollToAnchor href

  # detect section and highlight menu item
  $("section").waypoint
    handler: (direction) ->
      if direction is "down"
        highlightMenuItem $(".menu a[href = '#" + $(this).attr("name") + "']")
      else
        item = $(this).prev()
        if item.attr("name") is $(this).attr("name")
          item = item.prev()
        highlightMenuItem $(".menu a[href = '#" + item.attr("name") + "']")
    offset: "60px"
  

  # animation for arrow in service menu
  arrowOffset = ($(".service-menu-container a:first")[0].offsetLeft) - 40
  $(".service-menu-container a").mouseover(->
    $(".arrow").stop().animate
      left: (@offsetLeft - 40) + "px"
    , 500
  ).mouseout(->
    $(".arrow").stop().animate
      left: arrowOffset + "px"
    , 500
  ).click ->
    arrowOffset = @offsetLeft - 40
    #hide all content elements
    $(".service-container").addClass "hidden"
    $(".service-menu-container a").removeClass "active"
    #show linked element
    $(".service-container[data-content='" + $(this).data("target") + "']").removeClass "hidden"
    $(this).addClass "active"
  
  # animation for the quotes
  currentQuote = 1
  quoteLength = $("div.quote-text-box").length
  prev = $(".quote-links a:nth-child(1)")
  next = $(".quote-links a:nth-child(2)")
  Forward = ->
    $("div.quote-text-box[data-quote='" + currentQuote + "']").addClass "hidden"
    next.removeClass("active").css("cursor", "default").off "click"  if currentQuote is quoteLength - 1
    currentQuote += 1
    if currentQuote is 2
      prev.addClass("active").css("cursor", "pointer").click ->
        Backward()

    $("div.quote-text-box[data-quote='" + currentQuote + "']").removeClass "hidden"
  Backward = ->
    $("div.quote-text-box[data-quote='" + currentQuote + "']").addClass "hidden"
    prev.removeClass("active").css("cursor", "default").off "click"  if currentQuote is 2
    currentQuote -= 1
    if currentQuote is quoteLength - 1
      next.addClass("active").css("cursor", "pointer").click ->
        Forward()

    $("div.quote-text-box[data-quote='" + currentQuote + "']").removeClass "hidden"

  next.click ->
    Forward()

  prev.click ->
    Backward()

  
  #Parallax Effect
  t = $("a[name='stil']").offset().top
  $("div[data-type='logo'], section[data-type='background'], div[data-type='hat']").each ->
    $bgobj = $(this) # assigning the object
    $(window).scroll ->
      
      # Scroll the background at var speed
      # the yPos is a negative value because we're scrolling it UP!                
      if $bgobj.data("type") is "background"
        yPos = (($window.scrollTop() - $bgobj.offset().top) / $bgobj.data("speed")) - 200
        coords = "50% " + yPos + "px"
        $bgobj.css backgroundPosition: coords
      if $bgobj.data("type") is "logo"
        yPos = (($window.scrollTop() / $bgobj.data("speed")) + ($(window).height() * 0.15)) + "px"
        $bgobj.css top: (yPos)
      if $bgobj.data("type") is "hat"
        yPos = $window.height() * 0.3 - $window.scrollTop() / 2
        yPos = 12  if yPos < 9.5
        
        # Put together our final background position
        coords = yPos + "px"
        size = ((yPos / $window.height() * 150) + 50) + "%"
        
        # Move the background
        $bgobj.css top: coords
        $bgobj.css height: size



# window scroll Ends

# 
#     * Create HTML5 elements for IE's sake
#     
document.createElement "section"