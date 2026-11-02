import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type SignupFormData = z.infer<typeof signupSchema>

export const profileTextSchema = z.object({
  headline: z.string().min(1, 'Headline is required').max(220, 'Headline is too long'),
  about: z.string().min(10, 'About section needs at least 10 characters').max(2600, 'About section is too long'),
  experience: z.string().min(10, 'Please provide experience details'),
  skills: z.string().min(1, 'Please list at least one skill'),
})

export type ProfileTextFormData = z.infer<typeof profileTextSchema>

export const profileUrlSchema = z.object({
  url: z.string().url('Please enter a valid URL').refine(
    (url) => url.includes('linkedin.com/in/'),
    'Please enter a valid LinkedIn profile URL'
  ),
})

export type ProfileUrlFormData = z.infer<typeof profileUrlSchema>

export const postGenerationSchema = z.object({
  tone: z.enum(['professional', 'educational', 'storytelling', 'personal-branding']),
  length: z.enum(['short', 'medium', 'long']),
  context: z.string().max(500, 'Context is too long').optional(),
})

export type PostGenerationFormData = z.infer<typeof postGenerationSchema>
