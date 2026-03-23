const blockerRepo = require('../repositories/blockerRepository');
const blockerService = require('../services/blockerService');

class BlockerController {
  getDomains = async (req, res, next) => {
    try {
      const { search = '', page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      const data = await blockerRepo.getDomains(req.user.id, search, limit, offset);
      res.json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

  addDomains = async (req, res, next) => {
    try {
      const { domains } = req.body;
      const count = await blockerRepo.addDomains(req.user.id, domains, 'manual');
      res.status(201).json({ status: 'success', message: `Added ${count} domains.` });
    } catch (err) {
      next(err);
    }
  };

  importDomainsText = async (req, res, next) => {
    try {
      const { text, sourceName = 'manual-import' } = req.body;
      if (!text) return res.status(400).json({ error: 'Missing text content' });

      // If they named the source, add/update it in DB
      let sourceId = null;
      if (sourceName !== 'manual-import') {
        const source = await blockerRepo.addSource(req.user.id, sourceName, null);
        sourceId = source.id;
      }

      const count = await blockerService.importFromText(req.user.id, text, sourceName);
      if (sourceId) {
        await blockerRepo.updateSourceCount(req.user.id, sourceName, count);
      }
      res.status(201).json({ status: 'success', message: `Imported ${count} domains.` });
    } catch (err) {
      next(err);
    }
  };

  importDomains = async (req, res, next) => {
    // Note: The prompt has an explicit /import endpoint that creates a source and refreshes it.
    // Instead of doing it directly, we just call addSource + refreshSource logic.
    try {
      const { url, sourceName } = req.body;
      if (!url || !sourceName) return res.status(400).json({ error: 'Missing url or sourceName' });

      const source = await blockerRepo.addSource(req.user.id, sourceName, url);
      const count = await blockerService.refreshUrlSource(req.user.id, source.id);
      
      res.status(201).json({ status: 'success', message: `Imported ${count} domains from ${sourceName}.` });
    } catch (err) {
      next(err);
    }
  };

  removeDomain = async (req, res, next) => {
    try {
      await blockerRepo.removeDomain(req.params.id, req.user.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  tempUnblockDomain = async (req, res, next) => {
    try {
      const { minutes } = req.body;
      if (!minutes || isNaN(minutes)) return res.status(400).json({ error: 'Valid minutes required' });

      const domain = await blockerRepo.tempUnblockDomain(req.params.id, req.user.id, parseInt(minutes, 10));
      res.json({ status: 'success', data: { domain } });
    } catch (err) {
      next(err);
    }
  };

  // Sources
  getSources = async (req, res, next) => {
    try {
      const sources = await blockerRepo.getSources(req.user.id);
      res.json({ status: 'success', data: sources });
    } catch (err) {
      next(err);
    }
  };

  addSource = async (req, res, next) => {
    try {
      const { name, url } = req.body;
      if (!name || !url) return res.status(400).json({ error: 'Name and URL required' });

      const source = await blockerRepo.addSource(req.user.id, name, url);
      res.status(201).json({ status: 'success', data: source });
    } catch (err) {
      next(err);
    }
  };

  removeSource = async (req, res, next) => {
    try {
      const source = await blockerRepo.getSourceById(req.params.id, req.user.id);
      if (source) {
        await blockerRepo.removeDomainsBySource(req.user.id, source.name);
        await blockerRepo.removeSource(req.params.id, req.user.id);
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  refreshSource = async (req, res, next) => {
    try {
      const count = await blockerService.refreshUrlSource(req.user.id, req.params.id);
      res.json({ status: 'success', message: `Refreshed ${count} domains.` });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new BlockerController();
