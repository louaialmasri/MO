import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import { activeSalon } from '../middlewares/activeSalon'
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate, applyTemplate
} from '../controllers/availabilityTemplateController'

const router = express.Router()
router.use(verifyToken, verifyAdmin, activeSalon)

router.get('/', listTemplates)
router.post('/', createTemplate)
router.patch('/:id', updateTemplate)
router.delete('/:id', deleteTemplate)
router.post('/apply', applyTemplate)

export default router
