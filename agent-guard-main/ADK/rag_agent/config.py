# Configuration settings for the Agent Guard

class Config:
    def __init__(self):
        self.agent_name = "DefaultAgent"
        self.log_level = "INFO"
        self.max_retries = 5
        self.timeout = 30  # in seconds

    def display_config(self):
        print(f"Agent Name: {self.agent_name}")
        print(f"Log Level: {self.log_level}")
        print(f"Max Retries: {self.max_retries}")
        print(f"Timeout: {self.timeout} seconds")

# Example usage
if __name__ == "__main__":
    config = Config()
    config.display_config()