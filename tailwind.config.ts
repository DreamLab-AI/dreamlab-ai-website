import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import tailwindcssTypography from "@tailwindcss/typography";
import type { PluginAPI } from "tailwindcss/types/config";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
		    typography: (theme) => ({
		      DEFAULT: {
		        css: {
		          color: theme('colors.slate.700'), // Default text for prose on light bg
		          a: {
		            color: theme('colors.blue.600'),
		            '&:hover': {
		              color: theme('colors.blue.700'),
		            },
		          },
		          h1: { color: theme('colors.slate.900') },
		          h2: { color: theme('colors.slate.800') },
		          h3: { color: theme('colors.slate.800') },
		          h4: { color: theme('colors.slate.700') },
		          strong: { color: theme('colors.slate.900') },
		          code: {
		            color: theme('colors.pink.600'),
		            backgroundColor: theme('colors.slate.100'),
		            padding: '0.2em 0.4em',
		            borderRadius: '0.25rem',
		          },
		          pre: {
		            color: theme('colors.slate.200'), // Light text for code blocks
		            backgroundColor: theme('colors.slate.800'), // Dark bg for code blocks
		          },
		          blockquote: {
		            color: theme('colors.slate.600'),
		            borderLeftColor: theme('colors.slate.300'),
		          },
		          // Ensure list markers are also dark
		          'ul > li::before': { backgroundColor: theme('colors.slate.500') },
		          'ol > li::before': { color: theme('colors.slate.500') },
		        },
		      }, // DEFAULT object closes
		        invert: {
		          css: {
		            color: theme('colors.slate.300'), // Lighter base text for dark mode
		            a: {
		              color: theme('colors.blue.400'),
		              '&:hover': {
		                color: theme('colors.blue.300'),
		              },
		            },
		            h1: { color: theme('colors.slate.100') },
		            h2: { color: theme('colors.slate.200') },
		            h3: { color: theme('colors.slate.200') },
		            h4: { color: theme('colors.slate.300') },
		            strong: { color: theme('colors.slate.100') },
		            code: { // For inline code in dark mode
		              color: theme('colors.pink.400'),
		              backgroundColor: theme('colors.slate.800'),
		              padding: '0.2em 0.4em',
		              borderRadius: '0.25rem',
		            },
		            // 'pre' styles from DEFAULT are already dark-mode friendly (slate.200 text on slate.800 bg)
		            // and prose-invert typically doesn't re-invert them.
		            blockquote: {
		              color: theme('colors.slate.400'),
		              borderLeftColor: theme('colors.slate.700'),
		            },
		            'ul > li::before': { backgroundColor: theme('colors.slate.600') }, // Ensure markers are visible
		            'ol > li::before': { color: theme('colors.slate.400') },
		          }
		        }
		    }), // typography theme function's return object closes
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'fade-out': {
					'0%': {
						opacity: '1',
						transform: 'translateY(0)'
					},
					'100%': {
						opacity: '0',
						transform: 'translateY(10px)'
					}
				},
				'text-shimmer': {
					'0%': {
						backgroundPosition: '100% 50%',
					},
					'100%': {
						backgroundPosition: '0% 50%',
					},
				},
				'slide-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(30px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in-left': {
					'0%': {
						opacity: '0',
						transform: 'translateX(-30px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'slide-in-right': {
					'0%': {
						opacity: '0',
						transform: 'translateX(30px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'scale-in': {
					'0%': {
						opacity: '0',
						transform: 'scale(0.9)'
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)'
					}
				},
				'glow-pulse': {
					'0%, 100%': {
						boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
					},
					'50%': {
						boxShadow: '0 0 40px rgba(147, 51, 234, 0.8)',
					}
				},
				'float': {
					'0%, 100%': {
						transform: 'translateY(0px)',
					},
					'50%': {
						transform: 'translateY(-10px)',
					}
				},
				'gradient-shift': {
					'0%, 100%': {
						backgroundPosition: '0% 50%',
					},
					'50%': {
						backgroundPosition: '100% 50%',
					}
				},
				// Workshop-specific animations
				'path-draw': {
					'0%': {
						strokeDashoffset: '1',
					},
					'100%': {
						strokeDashoffset: '0',
					}
				},
				'node-pulse': {
					'0%, 100%': {
						opacity: '1',
						transform: 'scale(1)',
					},
					'50%': {
						opacity: '0.8',
						transform: 'scale(1.05)',
					}
				},
				'card-hover': {
					'0%': {
						transform: 'scale(1) translateY(0)',
						boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
					},
					'100%': {
						transform: 'scale(1.02) translateY(-4px)',
						boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
					}
				},
				'progress-fill': {
					'0%': {
						width: '0%',
					},
					'100%': {
						width: '100%',
					}
				},
				'stagger-fade': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)',
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)',
					}
				},
				'skill-unlock': {
					'0%': {
						opacity: '0',
						transform: 'scale(0.8) rotate(-5deg)',
					},
					'50%': {
						transform: 'scale(1.1) rotate(2deg)',
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1) rotate(0deg)',
					}
				},
				'timeline-reveal': {
					'0%': {
						opacity: '0',
						transform: 'translateX(-50px)',
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)',
					}
				},
				'badge-pop': {
					'0%': {
						opacity: '0',
						transform: 'scale(0)',
					},
					'50%': {
						transform: 'scale(1.2)',
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)',
					}
				},
				// 4D Hyperdimensional Hero Animations
				'hyperdimensional-float': {
					'0%, 100%': {
						transform: 'translateY(0) translateX(0) scale(1)',
						opacity: '0.12',
					},
					'16.67%': {
						transform: 'translateY(-8px) translateX(4px) scale(1.02)',
						opacity: '0.14',
					},
					'33.33%': {
						transform: 'translateY(-12px) translateX(-2px) scale(0.98)',
						opacity: '0.10',
					},
					'50%': {
						transform: 'translateY(-6px) translateX(-6px) scale(1.03)',
						opacity: '0.13',
					},
					'66.67%': {
						transform: 'translateY(-10px) translateX(3px) scale(0.97)',
						opacity: '0.11',
					},
					'83.33%': {
						transform: 'translateY(-4px) translateX(5px) scale(1.01)',
						opacity: '0.12',
					},
				},
				'w-drift': {
					'0%, 100%': {
						transform: 'translateZ(0) scale(1) rotateX(0deg) rotateY(0deg)',
						opacity: '0.08',
					},
					'25%': {
						transform: 'translateZ(20px) scale(1.05) rotateX(0.5deg) rotateY(-0.5deg)',
						opacity: '0.12',
					},
					'50%': {
						transform: 'translateZ(-10px) scale(0.95) rotateX(-0.3deg) rotateY(0.3deg)',
						opacity: '0.06',
					},
					'75%': {
						transform: 'translateZ(10px) scale(1.02) rotateX(0.2deg) rotateY(-0.2deg)',
						opacity: '0.10',
					},
				},
				'node-breathe': {
					'0%, 100%': {
						transform: 'scale(1)',
						opacity: '0.08',
					},
					'50%': {
						transform: 'scale(1.15)',
						opacity: '0.14',
					},
				},
				'connection-flow': {
					'0%': {
						backgroundPosition: '200% 0',
						opacity: '0.04',
					},
					'50%': {
						opacity: '0.08',
					},
					'100%': {
						backgroundPosition: '-200% 0',
						opacity: '0.04',
					},
				},
				'tesseract-project': {
					'0%, 100%': {
						transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
					},
					'25%': {
						transform: 'perspective(1000px) rotateX(1deg) rotateY(0.5deg) scale3d(1.01, 0.99, 1)',
					},
					'50%': {
						transform: 'perspective(1000px) rotateX(0.5deg) rotateY(1deg) scale3d(0.99, 1.01, 1)',
					},
					'75%': {
						transform: 'perspective(1000px) rotateX(-0.5deg) rotateY(0.5deg) scale3d(1, 1, 1)',
					},
				},
				'dimensional-shimmer': {
					'0%, 100%': {
						filter: 'hue-rotate(0deg) brightness(1)',
					},
					'33%': {
						filter: 'hue-rotate(15deg) brightness(1.02)',
					},
					'66%': {
						filter: 'hue-rotate(-10deg) brightness(0.98)',
					},
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out forwards',
				'fade-out': 'fade-out 0.5s ease-out forwards',
				'text-shimmer': 'text-shimmer 2.5s ease-in-out infinite',
				'slide-up': 'slide-up 0.6s ease-out forwards',
				'slide-in-left': 'slide-in-left 0.6s ease-out forwards',
				'slide-in-right': 'slide-in-right 0.6s ease-out forwards',
				'scale-in': 'scale-in 0.5s ease-out forwards',
				'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
				'float': 'float 3s ease-in-out infinite',
				'gradient-shift': 'gradient-shift 5s ease-in-out infinite',
				// Workshop animations
				'path-draw': 'path-draw 2s ease-out forwards',
				'node-pulse': 'node-pulse 2s ease-in-out infinite',
				'card-hover': 'card-hover 0.3s ease-out forwards',
				'progress-fill': 'progress-fill 1.5s ease-out forwards',
				'stagger-fade': 'stagger-fade 0.6s ease-out forwards',
				'skill-unlock': 'skill-unlock 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
				'timeline-reveal': 'timeline-reveal 0.8s ease-out forwards',
				'badge-pop': 'badge-pop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
				// 4D Hyperdimensional Hero Animations
				'hyperdimensional-float': 'hyperdimensional-float 12s cubic-bezier(0.4, 0, 0.2, 1) infinite',
				'w-drift': 'w-drift 16s cubic-bezier(0.4, 0, 0.2, 1) infinite',
				'node-breathe': 'node-breathe 8s ease-in-out infinite',
				'connection-flow': 'connection-flow 12s linear infinite',
				'tesseract-project': 'tesseract-project 20s cubic-bezier(0.4, 0, 0.2, 1) infinite',
				'dimensional-shimmer': 'dimensional-shimmer 15s ease-in-out infinite',
			},
			// Animation delay utilities
			animationDelay: {
				'0': '0ms',
				'75': '75ms',
				'100': '100ms',
				'150': '150ms',
				'200': '200ms',
				'300': '300ms',
				'400': '400ms',
				'500': '500ms',
				'700': '700ms',
				'1000': '1000ms',
			},
			// Perspective utilities for 3D transforms
			perspective: {
				'none': 'none',
				'500': '500px',
				'1000': '1000px',
				'1500': '1500px',
				'2000': '2000px',
			},
			backgroundSize: {
				'300%': '300%',
				'400%': '400%',
			}
		}
	},
	plugins: [
		tailwindcssAnimate,
		tailwindcssTypography,
		// Custom plugin for animation utilities
		function({ matchUtilities, theme }: PluginAPI) {
			matchUtilities(
				{
					'animation-delay': (value: string) => ({
						'animation-delay': value,
					}),
				},
				{ values: theme('animationDelay') }
			);
			matchUtilities(
				{
					'perspective': (value: string) => ({
						'perspective': value,
					}),
				},
				{ values: theme('perspective') }
			);
		},
		// Animation fill mode utilities
		function({ addUtilities }: PluginAPI) {
			addUtilities({
				'.animation-fill-none': {
					'animation-fill-mode': 'none',
				},
				'.animation-fill-forwards': {
					'animation-fill-mode': 'forwards',
				},
				'.animation-fill-backwards': {
					'animation-fill-mode': 'backwards',
				},
				'.animation-fill-both': {
					'animation-fill-mode': 'both',
				},
			});
		},
	],
} satisfies Config;
