import argparse
import logging
import os
# from dotenv import load_dotenv # Handled in AppConfig

# Assuming orchestrator and config will be in an 'orchestrator' subdirectory
from orchestrator import Orchestrator, AppConfig


def main():
    parser = argparse.ArgumentParser(description="CLI tool to generate workshop modules using AI agents.")
    parser.add_argument("--topic", type=str, required=True, help="The topic for the workshop to be generated.")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging.")

    args = parser.parse_args()

    config = AppConfig()

    log_level = logging.DEBUG if args.verbose else getattr(logging, config.log_level, logging.INFO)
    logging.basicConfig(level=log_level, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    logger = logging.getLogger(__name__)
    logger.info("Workshop Builder CLI started.")
    logger.debug(f"Arguments: Topic='{args.topic}', Verbose={args.verbose}")
    logger.debug(f"Configuration loaded. Log level: {config.log_level}")


    # Check if workshops_base_dir is absolute or relative to cli.py
    # For now, assume it's relative to the workshop-builder directory where cli.py resides
    if not os.path.isabs(config.workshops_base_dir):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        config.workshops_base_dir = os.path.join(script_dir, config.workshops_base_dir)
        config.workshops_base_dir = os.path.normpath(config.workshops_base_dir)
        logger.debug(f"Resolved workshops_base_dir to: {config.workshops_base_dir}")


    orchestrator = Orchestrator(config)
    try:
        orchestrator.run(args.topic)
    except Exception as e:
        logger.error(f"An error occurred during workshop generation: {e}", exc_info=True)
        print(f"Error: {e}")

if __name__ == "__main__":
    main()