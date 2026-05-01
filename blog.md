---
layout: default
title: "Blog"
permalink: /blog/
---
<div class="section-header" style="margin-bottom:2rem;">
  <span class="section-label">all posts</span>
  <span class="section-line"></span>
</div>

<div class="post-list">
{% for post in site.posts %}
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
{% if site.posts.size == 0 %}
  <p class="text-muted">// no posts yet</p>
{% endif %}
</div>
