// services/blockerService.js
const blockerRepo = require('../repositories/blockerRepository');
const axios = require('axios');

class BlockerService {
  parseHostFile(text) {
    const domains = new Set();
    const lines = text.split('\n');
    
    // valid domain chars (basic)
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      
      // Skip empty and comments
      if (!line || line.startsWith('#')) continue;

      // Hosts format: 0.0.0.0 domain.com or 127.0.0.1 domain.com
      const parts = line.split(/\s+/);
      let targetDomain = null;

      if (parts.length >= 2 && (parts[0] === '0.0.0.0' || parts[0] === '127.0.0.1')) {
        targetDomain = parts[1];
      } else if (parts.length === 1) {
        targetDomain = parts[0];
      }

      if (targetDomain) {
        targetDomain = targetDomain.toLowerCase();
        // Skip local hosts
        if (targetDomain === 'localhost' || targetDomain === 'broadcasthost' || targetDomain === '0.0.0.0' || targetDomain === '127.0.0.1') continue;
        
        // Basic validation
        if (domainRegex.test(targetDomain)) {
          domains.add(targetDomain);
        }
      }
    }
    
    return Array.from(domains);
  }

  async importFromText(userId, text, sourceName) {
    const domains = this.parseHostFile(text);
    if (domains.length === 0) return 0;
    
    const count = await blockerRepo.addDomains(userId, domains, sourceName);
    return count;
  }

  async refreshUrlSource(userId, sourceId) {
    const source = await blockerRepo.getSourceById(sourceId, userId);
    if (!source || !source.url) {
      throw new Error('Source not found or missing URL');
    }

    // Download the list
    const response = await axios.get(source.url, { responseType: 'text' });
    const textData = response.data;

    // Parse
    const domains = this.parseHostFile(textData);
    if (domains.length === 0) return 0;

    // Remove old items from this source before sync (optional)
    // Actually the prompt says: download URL, parse, UPSERT domains.
    // To ensure old ones are removed, we can delete by source first:
    await blockerRepo.removeDomainsBySource(userId, source.name);

    // Bulk insert new
    const added = await blockerRepo.addDomains(userId, domains, source.name);
    
    // Update source count
    await blockerRepo.updateSourceCount(userId, source.name, domains.length);
    
    return domains.length;
  }
}

module.exports = new BlockerService();
