package com.example.idmp.web.session;

import java.io.IOException;
import java.util.UUID;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

// stamps every visitor with an anonymous session id — no login, just enough to scope saved sandbox/profile state
// highest precedence so the id is on the request before any controller or downstream filter looks for it
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SessionCookieFilter implements Filter {

  public static final String COOKIE_NAME = "rxvkg-sid";
  public static final String ATTRIBUTE = "rxvkg-sid";
  private static final int MAX_AGE_DAYS = 30;

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
      throws IOException, ServletException {
    HttpServletRequest req = (HttpServletRequest) request;
    HttpServletResponse res = (HttpServletResponse) response;

    // first-time (or cookie-cleared) visitor: mint a fresh id and set it back on the response
    String sid = readSid(req);
    if (sid == null || sid.isBlank()) {
      sid = UUID.randomUUID().toString();
      Cookie c = new Cookie(COOKIE_NAME, sid);
      c.setPath("/");
      c.setHttpOnly(true); // js never needs it, keep it out of reach of scripts
      c.setMaxAge(MAX_AGE_DAYS * 24 * 60 * 60);
      res.addCookie(c);
    }

    // hand the id downstream via request attribute so controllers don't re-parse cookies
    req.setAttribute(ATTRIBUTE, sid);
    chain.doFilter(req, res);
  }

  private String readSid(HttpServletRequest req) {
    Cookie[] cookies = req.getCookies();
    if (cookies == null) return null;
    for (Cookie c : cookies) {
      if (COOKIE_NAME.equals(c.getName())) return c.getValue();
    }
    return null;
  }

  // controller-side accessor; blows up loudly if the filter somehow didn't run for this request
  public static String require(HttpServletRequest req) {
    Object v = req.getAttribute(ATTRIBUTE);
    if (v == null) throw new IllegalStateException("Session cookie filter not active");
    return v.toString();
  }
}
