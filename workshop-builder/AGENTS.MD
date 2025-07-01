# AGENTS.MD - Workshop Builder AI Guidance

## Project Overview

Workshop Builder is an advanced multi-agent orchestration system built on the **OpenAI API integration** for automated workshop content generation. The system integrates Gemini Flash 2.5 for deep research with OpenAI Chat Completions API for professional content generation, creating enterprise-level workshop modules that integrate seamlessly with existing infrastructure.

## OpenAI API integration Integration

This project implements actual OpenAI Chat Completions API integration following framework best practices:

### Core Principles
- **Direct OpenAI API Integration**: Real command-line interface integration with OpenAI Codex
- **Professional Standards**: Enterprise-level output with comprehensive validation
- **AGENTS.MD Guidance**: Project-specific AI guidance throughout the system
- **Comprehensive Error Handling**: Robust error management with cascading recovery
- **Seamless Integration**: Direct integration with existing workshop infrastructure

### Agent Architecture
1. **ResearchAgent**: Gemini Flash 2.5 API integration for comprehensive research
2. **CompilerAgent**: OpenAI Chat Completions API integration for professional content generation
3. **GitAgent**: Professional GitHub workflow with comprehensive PR descriptions
4. **Orchestrator**: Codex framework coordination with advanced error handling

## AI Agent Guidelines

### For ResearchAgent (`agents/research_agent.py`)
- **Use Actual Gemini Flash 2.5 API**: Implement real API integration, not simulated calls
- **Comprehensive Research**: Generate extensive research corpus with advanced reasoning
- **Professional Error Handling**: Implement robust API error handling and rate limiting
- **Structured Output**: Provide well-structured research data with metadata tracking
- **Integration Standards**: Follow Codex framework logging and error reporting

### For CompilerAgent (`agents/compiler_agent.py`)
- **OpenAI Chat Completions API Integration**: Use direct API calls to generate structured JSON content
- **AGENTS.MD Support**: Load and integrate project-specific guidance from this file
- **Fallback Generation**: Implement intelligent fallback when Codex CLI unavailable
- **Professional Validation**: Comprehensive content validation and error checking
- **Sandboxed Execution**: Secure execution environment with proper cleanup
- **Template Integration**: Professional Jinja2 template rendering with metadata

### For GitAgent (`agents/git_agent.py`)
- **Professional PR Creation**: Comprehensive descriptions with proper formatting
- **Integration Validation**: Verify compatibility with existing workshop structure
- **Proper Branch Management**: Feature branches with professional naming conventions
- **Comprehensive Metadata**: Include labels, reviewers, and detailed descriptions
- **Error Recovery**: Robust Git operation error handling and recovery

### For Orchestrator (`orchestrator/orchestrator.py`)
- **Codex Framework Coordination**: Professional agent orchestration following framework principles
- **Comprehensive Logging**: Detailed logging with professional formatting
- **Error Cascading**: Proper error handling with recovery mechanisms
- **Professional Output**: Enterprise-level status reporting and progress tracking
- **Configuration Management**: Advanced configuration with validation

## Content Generation Standards

### Workshop Structure Requirements
- **Sequential Markdown Files**: `00_introduction.md`, `01_core_concepts.md`, etc.
- **Professional Manifest**: Comprehensive `manifest.json` with metadata
- **Overview Documentation**: Professional `README.md` with navigation
- **Code Quality**: Production-ready code examples with proper documentation
- **Validation Checkpoints**: Include verification steps throughout content

### Professional Output Standards
- **Enterprise-Level Documentation**: Professional technical writing standards
- **Comprehensive Code Examples**: Production-ready code with proper syntax highlighting
- **Interactive Elements**: Practical exercises with validation steps
- **Error Prevention**: Anticipate common mistakes and provide preventive guidance
- **Cross-Platform Compatibility**: Ensure examples work across different environments

## Integration Requirements

### Existing Workshop Infrastructure
- **Structure Compatibility**: Must integrate with `public/data/workshops/` structure
- **Consistent Styling**: Match existing workshop presentation and formatting
- **Navigation Integration**: Provide clear navigation and cross-references
- **Search Optimization**: Include appropriate metadata for discoverability

### GitHub Integration
- **Professional Workflow**: Feature branches with proper naming conventions
- **Comprehensive Descriptions**: Detailed PR descriptions with context and rationale
- **Proper Labeling**: Include appropriate labels for categorization and review
- **Review Guidance**: Provide clear guidance for human reviewers

## Error Handling and Recovery

### Comprehensive Error Management
- **API Error Handling**: Robust handling of API failures with retry mechanisms
- **Validation Errors**: Comprehensive content validation with detailed error reporting
- **Integration Failures**: Graceful handling of Git and GitHub operation failures
- **Fallback Mechanisms**: Intelligent fallback generation when primary methods fail

### Professional Logging
- **Detailed Progress Tracking**: Comprehensive logging of all operations
- **Error Context**: Detailed error context for debugging and recovery
- **Performance Metrics**: Track operation timing and resource usage
- **Professional Formatting**: Clear, readable log output for monitoring

## Quality Assurance

### Content Validation
- **Technical Accuracy**: Verify all technical content for accuracy and completeness
- **Code Testing**: Test all code examples for functionality and compatibility
- **Flow Analysis**: Ensure logical progression and smooth transitions
- **Professional Standards**: Maintain enterprise-level documentation quality

### Integration Testing
- **Infrastructure Compatibility**: Verify seamless integration with existing systems
- **Cross-Platform Testing**: Ensure compatibility across different environments
- **Performance Validation**: Verify acceptable performance characteristics
- **Error Recovery Testing**: Test error handling and recovery mechanisms

## Development Guidelines

### Code Quality Standards
- **Professional Documentation**: Comprehensive docstrings and comments
- **Type Hints**: Use Python type hints throughout the codebase
- **Error Handling**: Implement comprehensive error handling with proper logging
- **Testing**: Include unit tests for critical functionality
- **Code Review**: Follow professional code review practices

### Configuration Management
- **Environment Variables**: Use environment variables for all configuration
- **Validation**: Implement comprehensive configuration validation
- **Documentation**: Document all configuration options clearly
- **Security**: Secure handling of API keys and sensitive information

## Future Enhancements

### Planned Improvements
- **Enhanced AI Model Support**: Integration with additional AI models and services
- **Interactive Mode**: User approval and editing capabilities between agent steps
- **Advanced Validation**: More sophisticated content validation and quality assurance
- **Performance Optimization**: Enhanced performance and resource utilization
- **Extended Integration**: Additional integration capabilities and platforms

### Extensibility
- **Modular Architecture**: Maintain modular design for easy extension
- **Plugin System**: Consider plugin architecture for additional functionality
- **API Expansion**: Expand API integration capabilities
- **API Updates**: Stay current with OpenAI API integration developments

## Review and Maintenance

### Human Review Requirements
- **Content Accuracy**: All generated content requires human expert review
- **Technical Validation**: Technical accuracy verification by subject matter experts
- **Pedagogical Review**: Educational effectiveness and flow validation
- **Professional Standards**: Ensure all output meets professional documentation standards

### Continuous Improvement
- **Feedback Integration**: Incorporate user feedback for system improvements
- **Performance Monitoring**: Monitor system performance and optimization opportunities
- **Framework Updates**: Stay current with OpenAI API integration updates
- **Best Practice Evolution**: Continuously evolve best practices based on experience

---

**Note**: This AGENTS.MD file provides comprehensive guidance for AI agents working on the Workshop Builder project. All agents should reference this file for project-specific requirements, standards, and best practices. The guidance ensures consistent, professional output that integrates seamlessly with the existing workshop infrastructure while maintaining enterprise-level quality standards.