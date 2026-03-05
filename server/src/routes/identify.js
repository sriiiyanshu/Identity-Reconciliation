import { Router } from 'express'
import { z } from 'zod'
import { identifyContact } from '../services/identityService.js'

const router = Router()

const identifySchema = z
  .object({
    email: z.string().email().optional().or(z.literal('').transform(() => undefined)).or(z.null().transform(() => undefined)),
    phoneNumber: z
      .union([z.string(), z.number()])
      .optional()
      .or(z.null().transform(() => undefined))
      .transform((value) => (value === undefined ? undefined : String(value).trim()))
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: 'Either email or phoneNumber is required'
  })

router.post('/identify', async (req, res) => {
  const parsed = identifySchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parsed.error.issues
    })
  }

  try {
    const result = await identifyContact(parsed.data)
    return res.status(200).json(result)
  } catch (error) {
    return res.status(500).json({
      message: 'Something went wrong',
      error: error.message
    })
  }
})

export default router
