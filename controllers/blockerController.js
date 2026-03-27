const blockerRepo = require('../repositories/blockerRepository');
const blockerService = require('../services/blockerService');

class BlockerController {
  getDomains = async (req, res, next) => {
    try {
      const targetUserId = req.targetUserId || req.user.id;
      const { search = '', page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      const data = await blockerRepo.getDomains(targetUserId, search, limit, offset);
      res.json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  addDomains = async (req, res, next) => {
    try {
      const targetUserId = req.targetUserId || req.user.id;
      const { domains } = req.body;
      const count = await blockerRepo.addDomains(targetUserId, domains, 'manual');
      res.status(201).json({ status: 'success', message: `Added ${count} domains.` });
    } catch (err) {
      next(err);
    }
  };

  importDomainsText = async (req, res, next) => {
    try {
      const targetUserId = req.targetUserId || req.user.id;
      const { text, sourceName = 'manual-import' } = req.body;
      if (!text) return res.status(400).json({ error: 'Missing text content' });

      // If they named the source, add/update it in DB
      let sourceId = null;
      if (sourceName !== 'manual-import') {
        const source = await blockerRepo.addSource(targetUserId, sourceName, null);
        sourceId = source.id;
      }

      const count = await blockerService.importFromText(targetUserId, text, sourceName);
      if (sourceId) {
        await blockerRepo.updateSourceCount(targetUserId, sourceName, count);
      }
      res.status(201).json({ status: 'success', message: `Imported ${count} domains.` });
    } catch (err) {
      next(err);
    }
  };

  importDomains = async (req, res, next) => {
    try {
      const targetUserId = req.targetUserId || req.user.id;
      const { url, sourceName } = req.body;
      if (!url || !sourceName) return res.status(400).json({ error: 'Missing url or sourceName' });

      const source = await blockerRepo.addSource(targetUserId, sourceName, url);
      const count = await blockerService.refreshUrlSource(targetUserId, source.id);
      
      res.status(201).json({ status: 'success', message: `Imported ${count} domains from ${sourceName}.` });
    } catch (err) {
      next(err);
    }
  };

  removeDomain = async (req, res, next) => {
    try {
      const targetUserId = req.targetUserId || req.user.id;
      await blockerRepo.removeDomain(req.params.id, targetUserId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  tempUnblockDomain = async (req, res, next) => {
    try {
      const targetUserId = req.targetUserId || req.user.id;
      const { minutes } = req.body;
      if (!minutes || isNaN(minutes)) return res.status(400).json({ error: 'Valid minutes required' });

      const domain = await blockerRepo.tempUnblockDomain(req.params.id, targetUserId, parseInt(minutes, 10));
      res.json({ status: 'success', data: { domain } });
    } catch (err) {
      next(err);
    }
  };

  // Sources
  getSources = async (req, res, next) => {
    try {
      const targetUserId = req.targetUserId || req.user.id;
      const sources = await blockerRepo.getSources(targetUserId);
      res.json({ status: 'success', data: sources });
    } catch (err) {
      next(err);
    }
  };

  addSource = async (req, res, next) => {
    try {
      const targetUserId = req.targetUserId || req.user.id;
      const { name, url } = req.body;
      if (!name || !url) return res.status(400).json({ error: 'Name and URL required' });

      const source = await blockerRepo.addSource(targetUserId, name, url);
      res.status(201).json({ status: 'success', data: source });
    } catch (err) {
      next(err);
    }
  };

  removeSource = async (req, res, next) => {
    try {
      const targetUserId = req.targetUserId || req.user.id;
      const source = await blockerRepo.getSourceById(req.params.id, targetUserId);
      if (source) {
        await blockerRepo.removeDomainsBySource(targetUserId, source.name);
        await blockerRepo.removeSource(req.params.id, targetUserId);
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  refreshSource = async (req, res, next) => {
    try {
      const targetUserId = req.targetUserId || req.user.id;
      const count = await blockerService.refreshUrlSource(targetUserId, req.params.id);
      res.json({ status: 'success', message: `Refreshed ${count} domains.` });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new BlockerController();
