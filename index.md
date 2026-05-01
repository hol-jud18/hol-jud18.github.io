---
layout: home
title: "hol-jud18"
---
<div class="hero">
  <p class="hero-prompt">whoami</p>
  <h1 class="hero-title">Jude Holz</h1>
  <p class="hero-sub">malware dev &nbsp;·&nbsp; security research &nbsp;·&nbsp; low-level systems</p>
  <p class="hero-bio">
    Northeastern CS student building toward offensive security. This site is where I document my research — 
    malware development, Windows internals, evasion techniques, and whatever I'm currently breaking apart 
    to understand. No polish, just process.
  </p>
  <div class="hero-links">
    <a href="/blog/" class="hero-link">blog</a>
    <a href="/about/" class="hero-link">about</a>
    <a href="https://github.com/hol-jud18" class="hero-link" target="_blank" rel="noopener">github</a>
  </div>
</div>

<div class="section-header">
  <span class="section-label">recent posts</span>
  <span class="section-line"></span>
</div>

<div class="post-list">
{% for post in site.posts limit:5 %}
  <a href="{{ post.url | relative_url }}" class="post-card">
    <div class="post-card-meta">
      <span class="post-date">{{ post.date | date: "%Y-%m-%d" }}</span>
      <div class="post-tags">
        {% for tag in post.tags %}
          <span class="tag {% if tag == 'malware' or tag == 'offensive' %}tag-red{% elsif tag == 'windows' or tag == 'linux' %}tag-blue{% else %}tag-accent{% endif %}">{{ tag }}</span>
        {% endfor %}
      </div>
    </div>
    <div class="post-card-title">{{ post.title }}</div>
    {% if post.description %}<div class="post-card-excerpt">{{ post.description }}</div>{% endif %}
  </a>
{% endfor %}
</div>
