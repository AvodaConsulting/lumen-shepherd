const Index = () => {
  // Redirect to dashboard or login
  if (typeof window !== "undefined") {
    window.location.href = "/dashboard";
  }
  return null;
};

export default Index;
