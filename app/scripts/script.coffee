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

$(document).ready ->
  
  # Cache the Window object
  $window = $(window)

  # variable if animations should be shown
  showAnimation = false
  if $window.width() < 960
    showAnimation = false
  else
    showAnimation = true
  
  # position logo container
  #resizeLogo = ->
  #  leftPos = (($window.width() - $(".logo-container").width()) / 2)
  #  $(".logo-container").css("left",leftPos + "px")

  #resizeLogo()
  # also on resize
  #$window.resize $.throttle 250, (e) ->
  #  resizeLogo()
  #  if $window.width() < 960
  #    showAnimation = false
  #  else
  #    showAnimation = true

  # Position hat
  #if $window.scrollTop() == 0
  #  $("div[data-type='hat']").css top: ($window.height() * 0.27) + "px", opacity: 1
  # Position Arrow
  offsetArrow = 40
  if $window.width() < 768
    offsetArrow = 20
  $(".arrow").css left: (($(".service-menu-container a:first")[0].offsetLeft) - offsetArrow) + "px"
  # Reference popup
  popupBackground = $("#popup-background")
  showPopup = (content, color) ->
    popupBackground.load "popups/" + content + ".html", ->
      popupBackground.css "background-color", color
      popupBackground.scrollTop(0)
      

    # lock scroll position, but retain settings for later
    scrollPosition = self.pageYOffset or document.documentElement.scrollTop or document.body.scrollTop
    html = jQuery("html") # it would make more sense to apply this to body, but IE7 won't have that
    html.data "scroll-position", scrollPosition
    html.data "previous-overflow", html.css("overflow")
    html.css "overflow", "hidden"
    #window.scrollTo 0, scrollPosition

  $(".reference-link-hover-content").not("[data-popup=none]").click ->
    showPopup $(this).data("popup"), $(this).data("color")
    popupBackground.removeClass "hidden"

  popupBackground.click ->
    closePopup $()

  $(".popup").click (e) ->
    e.stopPropagation()

  $(".close").click ->
    closePopup $()

  closePopup = ->
    popupBackground.addClass("hidden").empty()
    
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
    if showAnimation
      highlightMenuItem $(this)

  # gracefull scrolling
  scrollToAnchor = (aid) ->
    aTag = $("a[name='" + aid + "']")
    $('html, body').animate
      scrollTop: aTag.offset().top - 59
      ,1000
  
  $(".menu a, .mobile-menu a, .logo-bottom a").click ->
    href = $(this).data("target")
    scrollToAnchor href

  toggleMenu = (item) ->
    if item.hasClass "show"
      item.removeClass "show"
    else
      item.addClass "show"
    
  $(".mobile-menu li.first").click ->
    toggleMenu($(this).parent())

  $(".mobile-menu a").click ->
    toggleMenu($(this).parent().parent())

  # detect section and highlight menu item
  $("section").waypoint
    handler: (direction) ->
      if direction is "down"
        highlightMenuItem $(".menu a[data-target = '" + $(this).attr("name") + "']")
      else
        item = $(this).prev()
        if item.attr("name") is $(this).attr("name")
          item = item.prev()
        highlightMenuItem $(".menu a[data-target = '" + item.attr("name") + "']")
    offset: "60px"
  

  # animation for arrow in service menu
  arrowOffset = ($(".service-menu-container a:first")[0].offsetLeft) - offsetArrow
  $(".service-menu-container a").mouseover(->
    $(".arrow").stop().animate
      left: (@offsetLeft - offsetArrow) + "px"
    , 500
  ).mouseout(->
    $(".arrow").stop().animate
      left: arrowOffset + "px"
    , 500
  ).click ->
    arrowOffset = @offsetLeft - offsetArrow
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

  # Mailchimp form

  $('#mc-embedded-subscribe-form').submit (evt) ->
    evt.preventDefault()
    $form = $(this)
    $input = $form.find('#mce-EMAIL').removeClass('error')
    $.ajax
      type: $form.attr 'method'
      url: $form.attr 'action'
      data: $form.serialize()
      cache: false
      dataType: 'jsonp'
      jsonp: 'c'
      contentType: "application/json; charset=utf-8",
      error: (err) -> alert("Could not connect to the registration server. Please try again later.")
      success: (data) ->
        if data.result is 'error'
          $input.addClass('error')
        else
          $form.html('<h3>Danke, wir melden uns bei Ihnen.</h3>')



  #Parallax Effect

  compu = ($bgobj) ->
    if $bgobj.data("type") is "background"
      yPos = (($(this).scrollTop() - $bgobj.offset().top) / $bgobj.data("speed")) - 200
      if yPos < -450
        yPos = -450
      coords = "50% " + yPos + "px"
      $bgobj.css backgroundPosition: coords
    if $bgobj.data("type") is "logo"
      yPos = (($(this).scrollTop() / $bgobj.data("speed")) + ($(window).height() * 0.15)) + "px"
      $bgobj.css top: (yPos)
    if $bgobj.data("type") is "hat"
      yPos = $(window).height() * 0.27 - $(this).scrollTop() / 2
      if yPos < 9.5
        yPos = 12
      
      # Put together our final background position
      coords = yPos + "px"
      size = ((yPos / $(this).height() * 150) + 50) + "%"
      
      # Move the background
      $bgobj.css top: coords, height: size, opacity: 1

  t = $("a[name='stil']").offset().top
  if showAnimation
    $("div[data-type='logo'], section[data-type='background'], div[data-type='hat']").each ->
      $bgobj = $(this) # assigning the object
      compu($bgobj)
      $window.scroll ->
      
        # Scroll the background at var speed
        # the yPos is a negative value because we're scrolling it UP!                
        compu($bgobj)

  if not showAnimation and $window.width() < 650
    $(".service-container").draggable(axis: "x" , containment: [ -650+$window.width(), 0, 0, 250 ])

  initialize()

# window scroll Ends

# 
#     * Create HTML5 elements for IE's sake
#     
document.createElement "section"