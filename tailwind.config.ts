
import type { Config } from "tailwindcss";

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
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out',
				'fade-out': 'fade-out 0.5s ease-out',
				'text-shimmer': 'text-shimmer 2.5s ease-in-out infinite',
				'slide-up': 'slide-up 0.6s ease-out',
				'slide-in-left': 'slide-in-left 0.6s ease-out',
				'slide-in-right': 'slide-in-right 0.6s ease-out',
				'scale-in': 'scale-in 0.5s ease-out',
				'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
				'float': 'float 3s ease-in-out infinite',
				'gradient-shift': 'gradient-shift 5s ease-in-out infinite',
			},
			backgroundSize: {
				'300%': '300%',
				'400%': '400%',
			}
		}
	},
	plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
