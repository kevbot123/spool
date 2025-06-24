"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, FileText, Globe, Plus, HelpCircle, Loader2, AlertCircle, Upload, File } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useParams, useRouter } from "next/navigation"
import { TbFileTypeXml } from "react-icons/tb"
import { FaRss, FaSitemap } from "react-icons/fa6"
import { LuBug, LuRss, LuText, LuYoutube } from "react-icons/lu"
import { PLAN_DETAILS, PLANS, TRAINING_DATA } from "@/lib/config/pricing"

// Helper function to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  // Calculate the appropriate unit
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // Format the number with the appropriate unit
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

type TrainingSource = {
  id: string;
  created_at: string;
  chatbot_id: string;
  source_type: string;
  content: string | null;
  url: string | null;
  file_path: string | null;
  file_name?: string | null;
  file_type?: string | null;
  status: string;
  size_kb: number;
  size_bytes?: number; // Keep for backward compatibility
};

export default function SourcesPage() {
  const router = useRouter();
  const params = useParams();
  const [activeTab, setActiveTab] = useState("qa");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingSources, setTrainingSources] = useState<TrainingSource[]>([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState<string>("");
  
  // Q&A state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  
  // Text state
  const [textContent, setTextContent] = useState("");
  
  // Files state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // RSS Feed state
  const [rssUrl, setRssUrl] = useState("");
  const [isLoadingRss, setIsLoadingRss] = useState(false);
  
  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(false);
  
  // Fetch chatbot ID from URL or use default
  useEffect(() => {
    // Try to get chatbot ID from URL params
    const chatbotId = Array.isArray(params?.chatbotId) 
      ? params.chatbotId[0] 
      : params?.chatbotId;
    
    if (chatbotId) {
      setSelectedChatbotId(chatbotId);
      fetchTrainingSources(chatbotId);
    } else {
      // If no chatbot ID in URL, fetch the first chatbot
      fetchFirstChatbot();
    }
  }, [params]);
  
  // Switch to the appropriate tab when a source is added
  useEffect(() => {
    // If we're on the website tab but adding a Q&A or text source, switch tabs
    if (activeTab === "website" && (question || answer || textContent)) {
      if (question || answer) {
        setActiveTab("qa");
      } else if (textContent) {
        setActiveTab("text");
      }
    }
  }, [activeTab, question, answer, textContent]);
  
  const fetchFirstChatbot = async () => {
    try {
      const response = await fetch('/api/chatbot-config');
      if (!response.ok) throw new Error('Failed to fetch chatbot');
      
      const data = await response.json();
      // The API returns a single chatbot object directly, not an array
      if (data && data.id) {
        console.log('Found chatbot:', data.id);
        setSelectedChatbotId(data.id);
        fetchTrainingSources(data.id);
      } else {
        console.error('No chatbot found in response:', data);
        toast.error('No chatbot found for your account');
      }
    } catch (error) {
      console.error('Error fetching chatbot:', error);
      toast.error('Failed to load chatbot');
    }
  };
  
  const fetchTrainingSources = async (chatbotId: string) => {
    if (!chatbotId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/training-sources?chatbotId=${chatbotId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch training sources');
      }
      
      const data = await response.json();
      setTrainingSources(data.sources || []);
      
      // Load the first text source content into the text editor if available
      const textSources = (data.sources || []).filter((source: TrainingSource) => source.source_type === 'text');
      if (textSources.length > 0 && textSources[0].content) {
        setTextContent(textSources[0].content);
      }
    } catch (error) {
      console.error('Error fetching training sources:', error);
      toast.error('Failed to load training sources');
    } finally {
      setIsLoading(false);
    }
  };
  
  // We'll fetch real training sources from the API

  // State for crawl jobs
  const [crawlJobId, setCrawlJobId] = useState<string>("");
  const [crawlStatus, setCrawlStatus] = useState<string>("");
  const [crawlProgress, setCrawlProgress] = useState<{pagesProcessed: number, totalPages: number}>({pagesProcessed: 0, totalPages: 0});
  const [crawlResults, setCrawlResults] = useState<any[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [showCrawlResults, setShowCrawlResults] = useState<boolean>(false);
  
  // State for adding a single URL
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [newSingleUrl, setNewSingleUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Function to start crawling a website
  const handleFetchLinks = async () => {
    if (!websiteUrl) {
      toast.error("Please enter a website URL");
      return;
    }
    
    if (!selectedChatbotId) {
      toast.error("No chatbot selected");
      return;
    }
    
    try {
      setIsLoading(true);
      setCrawlStatus("starting");
      setShowCrawlResults(true);
      
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbotId: selectedChatbotId,
          url: websiteUrl,
          options: {
            maxPages: 500,
            maxDepth: 2,
            excludeUrls: ['/admin', '/wp-admin', '/login', '/cart', '/checkout']
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start crawling');
      }
      
      const data = await response.json();
      setCrawlJobId(data.jobId);
      setCrawlStatus("processing");
      
      // Start polling for status updates
      pollCrawlStatus(data.jobId);
      
    } catch (error) {
      console.error('Error starting crawl:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start crawling');
      setCrawlStatus("failed");
      setIsLoading(false);
    }
  }
  
  // Function to poll for crawl status updates
  const pollCrawlStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/crawl?jobId=${jobId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get crawl status');
      }
      
      const data = await response.json();
      
      setCrawlStatus(data.status);
      setCrawlProgress(data.progress);
      
      if (data.status === 'completed') {
        setCrawlResults(data.results || []);
        setIsLoading(false);
        toast.success(`Crawling completed! Found ${data.results?.length || 0} pages.`);
      } else if (data.status === 'failed') {
        setIsLoading(false);
        toast.error(`Crawling failed: ${data.error || 'Unknown error'}`);
      } else {
        // Continue polling if still processing
        setTimeout(() => pollCrawlStatus(jobId), 2000);
      }
      
    } catch (error) {
      console.error('Error polling crawl status:', error);
      setCrawlStatus("failed");
      setIsLoading(false);
      toast.error('Failed to get crawl status');
    }
  }
  
  // Function to save selected crawl results as training sources
  // Function to handle saving a single URL
  const handleSaveSingleUrl = async () => {
    if (!newSingleUrl) {
      setUrlError("Please enter a URL");
      toast.error("Please enter a URL");
      return;
    }
    
    // Clear any previous errors
    setUrlError(null);
    let pollingTimeout: NodeJS.Timeout | null = null;
    
    try {
      setIsLoading(true);
      
      // Add http:// if missing
      let urlToProcess = newSingleUrl;
      if (!urlToProcess.startsWith('http://') && !urlToProcess.startsWith('https://')) {
        urlToProcess = 'https://' + urlToProcess;
      }
      
      // Call the API to crawl a single URL
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbotId: selectedChatbotId,
          url: urlToProcess,
          options: {
            maxPages: 1, // Only crawl the single URL
            maxDepth: 0, // Don't follow any links
            excludeUrls: []
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to crawl URL');
      }
      
      // Get the job ID from the response
      const data = await response.json();
      const jobId = data.jobId;
      
      // Poll for job completion
      let status = 'processing';
      let attempts = 0;
      const maxAttempts = 10; // Maximum number of polling attempts
      let statusData: any = null;
      
      // Add a timeout to handle cases where the polling doesn't complete
      pollingTimeout = setTimeout(() => {
        console.log('Polling timeout reached');
        status = 'error';
        toast.error('Request timed out. The website may be blocking our crawler.');
        setIsLoading(false);
      }, 12000); // 12 second timeout
      
      while (status === 'processing' && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const statusResponse = await fetch(`/api/crawl?jobId=${jobId}`);
        if (!statusResponse.ok) {
          throw new Error('Failed to check crawl status');
        }
        
        statusData = await statusResponse.json();
        console.log('Status data:', statusData); // Debug log
        status = statusData.status;
        
        // Check for errors in the crawl job
        if (status === 'error' || statusData.error) {
          console.log('Error detected in crawl job:', statusData.error); // Debug log
          
          // Handle 403 Forbidden or other access errors
          if (statusData.error && (
              statusData.error.includes('403') || 
              statusData.error.includes('ERR_BAD_REQUEST') || 
              statusData.error.includes('ECONNREFUSED') || 
              statusData.error.includes('timeout') || 
              statusData.error.includes('status code 403') ||
              statusData.error.includes('Request failed')
          )) {
            // Set the error message in the UI
            setUrlError(`Cannot access ${urlToProcess} - The website may be blocking our crawler (403 Forbidden)`);
            toast.error(`Cannot access ${urlToProcess} - The website may be blocking our crawler`);
            // Save the URL even though we couldn't crawl it
            const saveResponse = await fetch('/api/training-sources', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chatbotId: selectedChatbotId,
                url: urlToProcess,
                content: 'Content could not be retrieved (403 Forbidden)',
                sourceType: 'website',
                size_kb: 0.1, // Minimal size
              }),
            });
            
            if (!saveResponse.ok) {
              const errorData = await saveResponse.json();
              
              // Handle training data limit errors specifically
              if (saveResponse.status === 413) {
                const details = errorData.details;
                setUrlError(
                  TRAINING_DATA.getWarningMessage(details?.currentUsage || 'unknown', details?.limit) + 
                  ` You have ${details?.remaining || '0 MB'} remaining.`
                );
                toast.error("Cannot add URL: Training data limit exceeded");
                return;
              }
              
              throw new Error(errorData.error || 'Failed to save URL');
            }
            
            // Refresh the training sources
            fetchTrainingSources(selectedChatbotId); // (1b)
            toast.success("URL added with limited content");
            
            // Reset the state
            setIsAddingUrl(false);
            setNewSingleUrl("");
            return;
          } else {
            throw new Error(`Failed to crawl URL: ${statusData.error || 'Unknown error'}`);
          }
        }
        
        if (statusData.results && statusData.results.length > 0) {
          // Save the crawled URL directly
          const saveResponse = await fetch('/api/training-sources', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chatbotId: selectedChatbotId,
              url: urlToProcess,
              content: statusData.results[0].content || 'No content retrieved',
              sourceType: 'website',
              size_kb: statusData.results[0].size_kb || 0.1, // Ensure at least a minimal size
            }),
          });
          
          if (!saveResponse.ok) {
            const errorData = await saveResponse.json();
            
            // Handle training data limit errors specifically
            if (saveResponse.status === 413) {
              const details = errorData.details;
              setUrlError(
                TRAINING_DATA.getWarningMessage(details?.currentUsage || 'unknown', details?.limit) + 
                ` You have ${details?.remaining || '0 MB'} remaining, but this URL content would add ${details?.attempted || 'unknown'}.`
              );
              toast.error("Cannot add URL: Training data limit exceeded");
              return;
            }
            
            throw new Error(errorData.error || 'Failed to save URL');
          }
          
          // Refresh the training sources
          fetchTrainingSources(selectedChatbotId); // (1a)
          toast.success("URL added successfully");
          
          // Reset the state
          setIsAddingUrl(false);
          setNewSingleUrl("");
          break;
        }
      }
      
      // Handle timeout case
      if (attempts >= maxAttempts && status === 'processing') {
        throw new Error('Crawling timed out. Please try again later.');
      }
    } catch (error: any) {
      console.error('Error adding URL:', error);
      const errorMessage = (error.message as string) || 'Failed to add URL';
      
      // Set the error message to display in the UI
      setUrlError(errorMessage);
      
      // Show toast notification
      toast.error(errorMessage);
      
      // If it's a 403 error, provide more specific feedback
      if (errorMessage.includes('403') || errorMessage.includes('ERR_BAD_REQUEST')) {
        setUrlError(`Cannot access ${newSingleUrl} - The website is blocking our crawler (403 Forbidden)`);
      }
    } finally {
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
      }
      setIsLoading(false);
      fetchTrainingSources(selectedChatbotId); // (1f)
    }
  };
  
  const handleSaveCrawlResults = async () => {
    if (!crawlJobId) {
      toast.error("No active crawl job");
      return;
    }
    
    try {
      setIsLoading(true);
      
      const urlsToSave = selectedUrls.length > 0 ? selectedUrls : crawlResults.map(result => result.url);
      const submittedCount = urlsToSave.length; // Get the count before the API call
      
      const response = await fetch('/api/crawl', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: crawlJobId,
          selectedUrls: urlsToSave
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save crawl results');
      }
      
      const data = await response.json();
      
      // Add the new sources to the state
      if (data.sources && data.sources.length > 0) {
        // Check if there were any updated sources
        const updatedCount = data.updatedCount || 0;
        if (updatedCount > 0) {
          toast.info(`Updated ${updatedCount} existing URLs with fresh content`);
        }
        
        setTrainingSources(prev => [...data.sources, ...prev]);
      }
      
      // Refresh the training sources
      await fetchTrainingSources(selectedChatbotId); // (1e)
      
      // Reset crawl state
      setCrawlJobId("");
      setCrawlStatus("");
      setCrawlProgress({pagesProcessed: 0, totalPages: 0});
      setCrawlResults([]);
      setSelectedUrls([]);
      setShowCrawlResults(false);
      setWebsiteUrl("");
      
      // Use the count of URLs submitted for saving in the toast message
      toast.success(`Processed ${submittedCount} pages as training sources`);
    } catch (error) {
      console.error('Error saving crawl results:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save crawl results');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Function to cancel a crawl job
  const handleCancelCrawl = async () => {
    if (!crawlJobId) {
      return;
    }
    
    try {
      const response = await fetch(`/api/crawl?jobId=${crawlJobId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel crawl');
      }
      
      // Reset crawl state
      setCrawlJobId("");
      setCrawlStatus("");
      setCrawlProgress({pagesProcessed: 0, totalPages: 0});
      setCrawlResults([]);
      setSelectedUrls([]);
      setShowCrawlResults(false);
      
      toast.success("Crawl job canceled");
    } catch (error) {
      console.error('Error canceling crawl:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel crawl');
    } finally {
      setIsLoading(false);
    }
  }

  const handleLoadSitemap = async () => {
    if (!sitemapUrl) {
      toast.error("Please enter a sitemap URL");
      return;
    }
    
    if (!selectedChatbotId) {
      toast.error("No chatbot selected");
      return;
    }
    
    try {
      setIsLoading(true);
      setCrawlStatus("starting");
      setShowCrawlResults(true);
      
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbotId: selectedChatbotId,
          sitemapUrl: sitemapUrl,
          options: {
            maxPages: 500,
            excludeUrls: ['/admin', '/wp-admin', '/login', '/cart', '/checkout']
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process sitemap');
      }
      
      const data = await response.json();
      setCrawlJobId(data.jobId);
      setCrawlStatus("processing");
      
      // Start polling for status updates
      pollCrawlStatus(data.jobId);
      
    } catch (error) {
      console.error('Error processing sitemap:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process sitemap');
      setCrawlStatus("failed");
      setIsLoading(false);
    }
  }

  const handleDeleteSource = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/training-sources?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete source');
      }
      
      // Remove the deleted source from the state
      setTrainingSources(prev => prev.filter(source => source.id !== id));
      toast.success("Source deleted successfully");
    } catch (error) {
      console.error('Error deleting source:', error);
      toast.error('Failed to delete source');
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeleteAll = async () => {
    if (!selectedChatbotId) {
      toast.error("No chatbot selected");
      return;
    }
    
    if (!confirm('Are you sure you want to delete all sources? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Delete each source individually
      const deletePromises = trainingSources.map(source => 
        fetch(`/api/training-sources?id=${source.id}`, {
          method: 'DELETE',
        })
      );
      
      await Promise.all(deletePromises);
      
      setTrainingSources([]);
      toast.success("All sources deleted successfully");
    } catch (error) {
      console.error('Error deleting all sources:', error);
      toast.error('Failed to delete all sources');
    } finally {
      setIsLoading(false);
    }
  }

  const handleRetrainAgent = async () => {
    if (!selectedChatbotId) {
      toast.error("No chatbot selected");
      return;
    }
    
    try {
      setIsTraining(true);
      
      const response = await fetch('/api/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbotId: selectedChatbotId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to train agent');
      }
      
      const data = await response.json();
      
      // Refresh the sources list to show updated status
      fetchTrainingSources(selectedChatbotId);
      
      toast.success(`Agent retrained successfully with ${data.trainedCount || 0} sources`);
    } catch (error) {
      console.error('Error training agent:', error);
      toast.error('Failed to train agent');
    } finally {
      setIsTraining(false);
    }
  }
  
  const handleAddQA = async () => {
    if (!question.trim() || !answer.trim()) {
      toast.error("Please enter both a question and an answer");
      return;
    }
    
    if (!selectedChatbotId) {
      toast.error("No chatbot selected");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Create the content and calculate its size
      const qaContent = JSON.stringify({ question, answer });
      const contentSizeBytes = new TextEncoder().encode(qaContent).length;
      const size_kb = Math.max(0.01, contentSizeBytes / 1024); // Ensure minimum size of 0.01 KB
      
      const response = await fetch('/api/training-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbotId: selectedChatbotId,
          sourceType: 'qa',
          content: qaContent,
          size_kb: size_kb,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle training data limit errors specifically
        if (response.status === 413) {
          const details = errorData.details;
          toast.error(
            `Training data limit exceeded! You're using ${details?.currentUsage || 'unknown'} of your ${details?.limit || '35.0 MB'} limit. ` +
            `You have ${details?.remaining || '0 MB'} remaining, but this Q&A would add ${details?.attempted || 'unknown'}.`
          );
          return;
        }
        
        throw new Error(errorData.error || 'Failed to add Q&A');
      }
      
      const data = await response.json();
      
      // Add the new source to the state
      setTrainingSources(prev => [data.source, ...prev]);
      
      // Clear the form
      setQuestion('');
      setAnswer('');
      
      toast.success("Q&A added successfully");
    } catch (error) {
      console.error('Error adding Q&A:', error);
      toast.error('Failed to add Q&A');
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleAddText = async () => {
    if (!textContent.trim()) {
      toast.error("Please enter some text content");
      return;
    }
    
    if (!selectedChatbotId) {
      toast.error("No chatbot selected");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Store the content before clearing the input
      const contentToAdd = textContent;
      
      // Calculate the size
      const contentSizeBytes = new TextEncoder().encode(contentToAdd).length;
      const size_kb = Math.max(0.01, contentSizeBytes / 1024); // Ensure minimum size of 0.01 KB
      
      // Clear the input field immediately for better UX
      setTextContent('');
      
      // Add a new text source (no longer replacing existing ones)
      const response = await fetch('/api/training-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbotId: selectedChatbotId,
          sourceType: 'text',
          content: contentToAdd,
          size_kb: size_kb,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle training data limit errors specifically
        if (response.status === 413) {
          // Restore the text content since we cleared it optimistically
          setTextContent(contentToAdd);
          
          const details = errorData.details;
          toast.error(
            `Training data limit exceeded! You're using ${details?.currentUsage || 'unknown'} of your ${details?.limit || '35.0 MB'} limit. ` +
            `You have ${details?.remaining || '0 MB'} remaining, but this text would add ${details?.attempted || 'unknown'}.`
          );
          return;
        }
        
        // Restore the text content for other errors too
        setTextContent(contentToAdd);
        throw new Error(errorData.error || 'Failed to add text');
      }
      
      const data = await response.json();
      
      // Add the new source to the state
      setTrainingSources(prev => [data.source, ...prev]);
      
      toast.success("Text added successfully");
    } catch (error) {
      console.error('Error adding text:', error);
      toast.error('Failed to add text');
    } finally {
      setIsLoading(false);
    }
  }
  
  // Function to display source content based on type
  const getSourceContent = (source: TrainingSource) => {
    if (source.source_type === 'qa' && source.content) {
      try {
        const qaContent = JSON.parse(source.content);
        return `Q: ${qaContent.question}\nA: ${qaContent.answer}`;
      } catch (e) {
        return source.content;
      }
    }
    
    if (source.source_type === 'website' && source.url) {
      return source.url;
    }
    
    return source.content || 'No content';
  }

  // Handle file upload
  const handleFileUpload = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    if (!selectedChatbotId) {
      toast.error("No chatbot selected");
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // Convert to array for easier handling
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    
    // Validate file types
    const validTypes = [".pdf", ".doc", ".docx", ".txt", ".csv", ".json", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/csv", "application/json"];
    const invalidFiles = fileArray.filter(file => {
      const fileType = file.type;
      const fileExt = file.name.substring(file.name.lastIndexOf('.'));
      return !validTypes.some(type => type === fileType || type === fileExt.toLowerCase());
    });
    
    if (invalidFiles.length > 0) {
      toast.error(`Invalid file type(s): ${invalidFiles.map(f => f.name).join(', ')}. Only .pdf, .doc, .docx, .txt, .csv, and .json files are supported.`);
      setIsUploading(false);
      return;
    }
    
    // Check for large files that might exceed limits
    const totalSizeMB = fileArray.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
    if (totalSizeMB > 30) { // Warn if total files are over 30MB
      const proceed = confirm(
        `You're uploading ${totalSizeMB.toFixed(1)} MB of files. This might exceed your ${TRAINING_DATA.DEFAULT_LIMIT_MB} MB training data limit. Continue anyway?`
      );
      if (!proceed) {
        setIsUploading(false);
        return;
      }
    }
    
    // Process each file
    try {
      const uploadPromises = fileArray.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatbotId', selectedChatbotId);
        
        const response = await fetch('/api/upload-file', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          
          // Handle training data limit errors specifically
          if (response.status === 413) {
            const details = errorData.details;
            throw new Error(
              `Training data limit exceeded! You're using ${details?.currentUsage || 'unknown'} of your ${details?.limit || '35.0 MB'} limit. ` +
              `You have ${details?.remaining || '0 MB'} remaining, but "${file.name}" (${details?.fileSize || 'unknown'}) would exceed your limit.`
            );
          }
          
          throw new Error(errorData.error || `Failed to upload ${file.name}`);
        }
        
        return await response.json();
      });
      
      // Update progress as files complete
      let completed = 0;
      const results = await Promise.all(
        uploadPromises.map(promise => 
          promise.then(result => {
            completed++;
            setUploadProgress(Math.round((completed / fileArray.length) * 100));
            return result;
          }).catch(error => {
            completed++;
            setUploadProgress(Math.round((completed / fileArray.length) * 100));
            throw error;
          })
        )
      );
      
      // Add the new sources to the state
      const newSources = results.map(result => result.source).filter(Boolean);
      setTrainingSources(prev => [...newSources, ...prev]);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploadedFiles([]);
      
      toast.success(`${newSources.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle RSS feed import
  const handleRssImport = async () => {
    if (!rssUrl.trim()) {
      toast.error("Please enter an RSS feed URL");
      return;
    }
    
    if (!selectedChatbotId) {
      toast.error("No chatbot selected");
      return;
    }
    
    try {
      setIsLoadingRss(true);
      
      const response = await fetch('/api/import-rss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbotId: selectedChatbotId,
          rssUrl: rssUrl.trim(),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle rate limiting specifically
        if (response.status === 429 && errorData.rateLimited) {
          const resetTime = errorData.resetTime ? new Date(errorData.resetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const rateLimitMessage = resetTime 
            ? `${errorData.error} (Try again after ${resetTime})`
            : errorData.error;
          toast.error(rateLimitMessage, { duration: 8000 }); // Show longer for rate limit
          return; // Don't throw error, just show toast and return
        }
        
        throw new Error(errorData.error || 'Failed to import RSS feed');
      }
      
      const data = await response.json();
      
      // Add the new sources to the state
      if (data.sources && data.sources.length > 0) {
        setTrainingSources(prev => [...data.sources, ...prev]);
        
        // Show success message with rate limit info
        const rateLimitInfo = data.rateLimit?.remainingImports !== undefined 
          ? ` (${data.rateLimit.remainingImports} imports remaining)`
          : '';
        toast.success(`Successfully imported ${data.sources.length} articles from RSS feed${rateLimitInfo}`);
      } else {
        toast.info("RSS feed imported but no new articles found");
      }
      
      // Clear the input
      setRssUrl('');
      
    } catch (error) {
      console.error('Error importing RSS feed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import RSS feed');
    } finally {
      setIsLoadingRss(false);
    }
  };

  // Handle YouTube transcript import
  const handleYoutubeImport = async () => {
    if (!youtubeUrl.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    
    if (!selectedChatbotId) {
      toast.error("No chatbot selected");
      return;
    }
    
    try {
      setIsLoadingYoutube(true);
      
      const response = await fetch('/api/import-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbotId: selectedChatbotId,
          youtubeUrl: youtubeUrl.trim(),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import YouTube video');
      }
      
      const data = await response.json();
      
      // Add the new source to the state
      if (data.source) {
        setTrainingSources(prev => [data.source, ...prev]);
        toast.success(`Successfully imported transcript: "${data.source.title || 'YouTube Video'}"`);
      }
      
      // Clear the input
      setYoutubeUrl('');
      
    } catch (error) {
      console.error('Error importing YouTube video:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import YouTube video');
    } finally {
      setIsLoadingYoutube(false);
    }
  };

  // Calculate source statistics
  const calculateSourceStats = () => {
    const textSources = trainingSources.filter(source => source.source_type === 'text');
    const qaSources = trainingSources.filter(source => source.source_type === 'qa');
    const websiteSources = trainingSources.filter(source => source.source_type === 'website');
    const fileSources = trainingSources.filter(source => source.source_type === 'file');
    const rssSources = trainingSources.filter(source => source.source_type === 'rss');
    const youtubeSources = trainingSources.filter(source => source.source_type === 'youtube');
    
    // Calculate sizes in KB
    const textSizeKB = textSources.reduce((total, source) => total + (source.size_kb || 0), 0);
    const qaSizeKB = qaSources.reduce((total, source) => total + (source.size_kb || 0), 0);
    const websiteSizeKB = websiteSources.reduce((total, source) => total + (source.size_kb || 0), 0);
    const fileSizeKB = fileSources.reduce((total, source) => total + (source.size_kb || 0), 0);
    const rssSizeKB = rssSources.reduce((total, source) => total + (source.size_kb || 0), 0);
    const youtubeSizeKB = youtubeSources.reduce((total, source) => total + (source.size_kb || 0), 0);
    
    // Calculate total size
    const totalSizeKB = textSizeKB + qaSizeKB + websiteSizeKB + fileSizeKB + rssSizeKB + youtubeSizeKB;
    
    // Convert to bytes for display (1 KB = 1024 bytes)
    const textSizeBytes = textSizeKB * 1024;
    const qaSizeBytes = qaSizeKB * 1024;
    const websiteSizeBytes = websiteSizeKB * 1024;
    const fileSizeBytes = fileSizeKB * 1024;
    const rssSizeBytes = rssSizeKB * 1024;
    const youtubeSizeBytes = youtubeSizeKB * 1024;
    const totalSizeBytes = totalSizeKB * 1024;
    
    const pendingSources = trainingSources.filter(source => source.status === 'pending');
    
    return {
      textSources: textSources.length,
      qaSources: qaSources.length,
      websiteSources: websiteSources.length,
      fileSources: fileSources.length,
      rssSources: rssSources.length,
      youtubeSources: youtubeSources.length,
      textSizeBytes,
      qaSizeBytes,
      websiteSizeBytes,
      fileSizeBytes,
      rssSizeBytes,
      youtubeSizeBytes,
      totalSizeBytes,
      pendingCount: pendingSources.length
    };
  };
  
  const sourceStats = calculateSourceStats();
  
  // Loading skeleton - show until we have data or confirmed no data
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Main content skeleton */}
          <div className="lg:col-span-9">
            <Tabs defaultValue="qa" className="flex flex-row">
              {/* Tabs sidebar skeleton */}
              <div className="flex flex-col h-full bg-background p-3 gap-1 w-[210px] mr-1 rootcard rounded-xl">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="w-full h-10 rounded-md" />
                ))}
              </div>

              {/* Tab content skeleton */}
              <Card className="rootcard flex-1">
                <CardContent className="px-6 py-4">
                  <div className="space-y-4">
                    {/* Header skeleton */}
                    <div className="space-y-1">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-96" />
                    </div>
                    
                    {/* Form skeleton for Q&A tab */}
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                      <div className="flex justify-end pt-2">
                        <Skeleton className="h-10 w-20" />
                      </div>
                    </div>

                    {/* Sources list skeleton */}
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                      
                      <div className="space-y-2 mt-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="p-2 border rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <Skeleton className="h-6 w-16 rounded-full mr-3" />
                                <Skeleton className="h-3 w-12" />
                              </div>
                              <Skeleton className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-4 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Tabs>
          </div>
          
          {/* Sidebar skeleton */}
          <div className="lg:col-span-3">
            <Card className="rootcard">
              <CardContent className="px-6 py-4 text-sm">
                <Skeleton className="h-6 w-20 mb-4" />
                
                <div className="space-y-3">
                  {/* Stats items skeleton */}
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Skeleton className="h-4 w-4 mr-2" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                  
                  {/* Total size skeleton */}
                  <div className="border-t pt-3 mt-5">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-16" />
                      <div className="text-right">
                        <Skeleton className="h-4 w-12 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Button skeleton */}
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-9">

              <Tabs defaultValue="qa" className="flex flex-row">
                <TabsList className="flex flex-col h-full bg-background p-3 gap-1 w-[210px] mr-1 rootcard rounded-xl">
                  <TabsTrigger value="qa" className="w-full py-2 justify-start hover:bg-accent data-[state=active]:bg-blue-50 data-[state=active]:shadow-none data-[state=active]:text-primary"><HelpCircle className="h-4 w-4" />Q&A Pairs</TabsTrigger>
                  <TabsTrigger value="text" className="w-full py-2 justify-start hover:bg-accent data-[state=active]:bg-blue-50 data-[state=active]:shadow-none data-[state=active]:text-primary"><LuText className="h-4 w-4" />Raw Text</TabsTrigger>
                  <TabsTrigger value="files" className="w-full py-2 justify-start hover:bg-accent data-[state=active]:bg-blue-50 data-[state=active]:shadow-none data-[state=active]:text-primary"><File className="h-4 w-4" />Files</TabsTrigger>
                  <TabsTrigger value="website" className="w-full py-2 justify-start hover:bg-accent data-[state=active]:bg-blue-50 data-[state=active]:shadow-none data-[state=active]:text-primary"><Globe className="h-4 w-4" />URLs</TabsTrigger>
                  <TabsTrigger value="rss" className="w-full py-2 justify-start hover:bg-accent data-[state=active]:bg-blue-50 data-[state=active]:shadow-none data-[state=active]:text-primary"><LuRss className="h-4 w-4" />RSS Feeds</TabsTrigger>
                  <TabsTrigger value="youtube" className="w-full py-2 justify-start hover:bg-accent data-[state=active]:bg-blue-50 data-[state=active]:shadow-none data-[state=active]:text-primary"><LuYoutube className="h-4 w-4" />YouTube</TabsTrigger>
                </TabsList>

                <TabsContent value="website">
                <Card className="rootcard">
                  <CardContent className="px-6 py-4">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold mr-2">URLs</h2>
                      <p className="text-sm text-muted-foreground">
                      Use our web scraper to collect training data (we recommend the sitemap option). Note: some websites block scraping. If having trouble, try exporting content from your CMS (as a file) or use a scraping browser extension that mimics a user.
                      </p>
                    </div>
                    
                    <Tabs defaultValue="crawl-website" className="mt-5">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="single-url" className="flex items-center gap-1"><Plus className="h-4 w-4" />Add Single URL</TabsTrigger>
                        <TabsTrigger value="crawl-website" className="flex items-center gap-1"><LuBug className="h-4 w-4" />Crawl Website</TabsTrigger>
                        <TabsTrigger value="crawl-sitemap" className="flex items-center gap-1"><FaSitemap className="h-4 w-4" />Crawl Sitemap</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="single-url" className="pt-4">
                        <div className="space-y-2">
                          <span className="text-sm font-medium">Enter URL</span>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="https://www.example.com"
                              value={newSingleUrl}
                              onChange={(e) => {
                                setNewSingleUrl(e.target.value);
                                // Clear error when user types
                                if (urlError) setUrlError(null);
                              }}
                              disabled={isLoading}
                              className={urlError ? "border-red-500" : ""}
                            />
                            <Button 
                              onClick={handleSaveSingleUrl} 
                              disabled={isLoading || !newSingleUrl}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                "Add URL"
                              )}
                            </Button>
                          </div>
                          {urlError && (
                            <div className="mt-2 text-sm text-red-500">
                              <AlertCircle className="h-4 w-4 inline mr-1" />
                              {urlError}
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground">
                            This will add a single URL to your chatbot's training data without crawling subpages.
                          </p>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="crawl-website" className="pt-4">
                        <div className="space-y-2">
                          <span className="text-sm font-medium">Enter Website URL</span>
                          <div className="flex items-center gap-2">
                            <Input
                              id="website-url-input"
                              placeholder="https://www.example.com"
                              value={websiteUrl}
                              onChange={(e) => setWebsiteUrl(e.target.value)}
                              disabled={isLoading || crawlStatus === 'processing'}
                            />
                            <Button 
                              onClick={handleFetchLinks} 
                              disabled={isLoading || !websiteUrl || crawlStatus === 'processing'}
                            >
                              {isLoading && crawlStatus === 'starting' ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Starting...
                                </>
                              ) : crawlStatus === 'processing' ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Crawling...
                                </>
                              ) : (
                                "Crawl Website"
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            This will crawl all the pages on a website, up to 2 levels deep.
                          </p>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="crawl-sitemap" className="pt-4">
                        <div className="space-y-2">
                          <span className="text-sm font-medium">Submit Sitemap</span>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="https://www.example.com/sitemap.xml"
                              value={sitemapUrl}
                              onChange={(e) => setSitemapUrl(e.target.value)}
                              disabled={isLoading || crawlStatus === 'processing'}
                            />
                            <Button 
                              onClick={handleLoadSitemap} 
                              disabled={isLoading || !sitemapUrl || crawlStatus === 'processing'}
                            >
                              {isLoading && crawlStatus === 'starting' ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Starting...
                                </>
                              ) : crawlStatus === 'processing' ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                "Process Sitemap"
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Most reliable option. This will process URLs from your sitemap, up to 500 pages at a time.
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  {/* Crawl Progress and Results */}
                  {showCrawlResults && (
                    <div className="mt-6 border rounded-md p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-semibold">Crawl Progress</h3>
                        {crawlStatus === 'processing' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleCancelCrawl}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      {crawlStatus === 'processing' && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Processing pages...</span>
                            <span>{crawlProgress.pagesProcessed} / {crawlProgress.totalPages || '?'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ 
                                width: crawlProgress.totalPages 
                                  ? `${Math.min(100, (crawlProgress.pagesProcessed / crawlProgress.totalPages) * 100)}%` 
                                  : '5%' 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {/* Results */}
                      {crawlStatus === 'completed' && crawlResults.length > 0 && (
                        <div className="space-y-4">
                          <p className="text-sm">
                            Found {crawlResults.length} pages. Select which pages to add as training sources:
                          </p>
                          
                          <div className="flex justify-start items-center mb-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedUrls(crawlResults.map(r => r.url))}
                            >
                              Select All
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedUrls([])}
                            >
                              Deselect All
                            </Button>
                          </div>
                          
                          <div className="max-h-60 overflow-y-auto border rounded-md">
                            {crawlResults.map((result, index) => (
                              <div 
                                key={index} 
                                className={`flex items-center p-2 hover:bg-gray-50 ${index !== crawlResults.length - 1 ? 'border-b' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  className="mr-2"
                                  checked={selectedUrls.includes(result.url)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedUrls(prev => [...prev, result.url]);
                                    } else {
                                      setSelectedUrls(prev => prev.filter(url => url !== result.url));
                                    }
                                  }}
                                />
                                <div className="flex-1 overflow-hidden">
                                  <div className="text-sm font-medium truncate">{result.title || 'No title'}</div>
                                  <div className="text-xs text-muted-foreground truncate">{result.url}</div>
                                </div>
                                <div className="text-xs text-muted-foreground ml-2">{formatBytes(result.size_kb * 1024 || 0)}</div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-end">
                            <Button 
                              onClick={handleSaveCrawlResults}
                              disabled={isLoading || selectedUrls.length === 0}
                            >
                              {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Add {selectedUrls.length || 'All'} Pages as Sources
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Error State */}
                      {crawlStatus === 'failed' && (
                        <div className="text-center py-4">
                          <p className="text-red-500">Crawling failed. Please try again.</p>
                          <Button 
                            variant="outline" 
                            className="mt-2"
                            onClick={() => {
                              setCrawlJobId("");
                              setCrawlStatus("");
                              setCrawlProgress({pagesProcessed: 0, totalPages: 0});
                              setCrawlResults([]);
                              setSelectedUrls([]);
                              setShowCrawlResults(false);
                            }}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-8">
                    {trainingSources.some(source => source.source_type === 'website') && (
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold">All URLs</h3>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          // Delete only website sources
                          const websiteSources = trainingSources.filter(source => source.source_type === 'website');
                          if (websiteSources.length > 0) {
                            if (confirm('Delete all website sources? This action cannot be undone.')) {
                              setIsLoading(true); // Set loading state when starting deletion
                              Promise.all(
                                websiteSources.map(source => 
                                  fetch(`/api/training-sources?id=${source.id}`, { method: 'DELETE' })
                                )
                              ).then(() => {
                                setTrainingSources(prev => prev.filter(source => source.source_type !== 'website'));
                                toast.success("All website sources deleted");
                                setIsLoading(false); // Reset loading state when done
                              }).catch(error => {
                                console.error('Error deleting website sources:', error);
                                toast.error('Failed to delete website sources');
                                setIsLoading(false); // Reset loading state on error
                              });
                            }
                          } else {
                            toast.info("No website sources to delete");
                          }
                        }}
                        className="text-destructive"
                        disabled={isLoading || !trainingSources.some(source => source.source_type === 'website')}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Delete All
                          </>
                        )}
                      </Button>
                    </div>
                    )}
                    {isLoading ? (
                      <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {trainingSources
                          .filter(source => source.source_type === 'website')
                          .map((source) => (
                            <div key={source.id} className="flex items-center justify-between p-2 border rounded-md">
                              <div className="flex items-center">
                                <div className={`px-2 py-1 text-xs rounded-full mr-3 ${
                                  source.status === "trained" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                }`}>
                                  {source.status === "trained" ? "Trained" : "Pending"}
                                </div>
                                <div className="flex flex-col">
                                  
                                  <span className="text-xs text-foreground truncate max-w-[400px]">
                                    {source.url || 'No URL'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <span className="text-xs text-muted-foreground mr-4">{source.size_kb > 0 ? formatBytes(source.size_kb * 1024) : '0 Bytes'}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteSource(source.id)}
                                  disabled={isLoading}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                        ))}
                      </div>
                    )}
                  </div>
                  </CardContent>
                </Card>
                </TabsContent>
                
                <TabsContent value="text" className="space-y-4">
                <Card className="rootcard">
                  <CardContent className="px-6 py-4">
                  <div className="space-y-6">

                    <div className="space-y-1">
                      <h2 className="text-base font-semibold mr-2">Raw Text</h2>
                      <p className="text-sm text-muted-foreground">
                        Format any way you want; basic sentences, pro/con lists, JSON data, Markdown, YAML, etc.
                      </p>
                    </div>

                    <div className="space-y-2">

                      <Textarea
                        placeholder="Enter text content to train your chatbot..."
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        className="min-h-[190px]"
                      />
                      <div className="flex justify-end pt-2">
                        <Button 
                          onClick={handleAddText} 
                          disabled={isLoading || !textContent.trim()}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          Add Text
                        </Button>
                      </div>
                    </div>
                    
                    {/* Text Sources List */}
                    <div className="mt-4">
                      {trainingSources.some(source => source.source_type === 'text') && (
                      <div className="flex justify-between items-center">
                        <h3 className="text-base font-semibold">Text Sources</h3>

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              const textSources = trainingSources.filter(source => source.source_type === 'text');
                              if (textSources.length > 0 && confirm('Delete all text sources? This action cannot be undone.')) {
                                Promise.all(
                                  textSources.map(source => 
                                    fetch(`/api/training-sources?id=${source.id}`, { method: 'DELETE' })
                                  )
                                ).then(() => {
                                  setTrainingSources(prev => prev.filter(source => source.source_type !== 'text'));
                                  toast.success("All text sources deleted");
                                }).catch(error => {
                                  console.error('Error deleting text sources:', error);
                                  toast.error('Failed to delete text sources');
                                });
                              }
                            }}
                            disabled={isLoading || !trainingSources.some(source => source.source_type === 'text')}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete All
                          </Button>
                       
                      </div>
                      )}
                      
                      {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {trainingSources
                            .filter(source => source.source_type === 'text')
                            .map((source) => (
                              <div key={source.id} className="p-2 border rounded-md">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center">
                                    <div className={`px-2 py-1 text-xs rounded-full mr-3 ${
                                      source.status === "trained" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                    }`}>
                                      {source.status === "trained" ? "Trained" : "Pending"}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{source.size_kb > 0 ? formatBytes(source.size_kb * 1024) : '0 Bytes'}</span>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDeleteSource(source.id)}
                                    disabled={isLoading}
                                    className="h-6 w-6"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                                <div className="text-sm text-muted-foreground overflow-hidden text-ellipsis">
                                  {source.content ? (
                                    <div className="max-h-24 overflow-hidden relative">
                                      <p className="whitespace-pre-wrap">
                                        {source.content.length > 150 
                                          ? source.content.substring(0, 150) + '...' 
                                          : source.content
                                        }
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="italic">No content</p>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  </CardContent>
                </Card>
                </TabsContent>
                
                <TabsContent value="qa" className="space-y-4">
                <Card className="rootcard">
                  <CardContent className="px-6 py-4">
                  <div className="space-y-6">

                    <div className="space-y-1">
                      <h2 className="text-base font-semibold mr-2">Q&A Pairs</h2>
                      <p className="text-sm text-muted-foreground">
                        Pre-answered questions so your chatbot always says the right thing for important queries.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Question</label>
                        <Input
                          placeholder="Enter a question..."
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Answer</label>
                        <Textarea
                          placeholder="Enter the answer..."
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          className="min-h-[100px]"
                        />
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button 
                          onClick={handleAddQA} 
                          disabled={isLoading || !question.trim() || !answer.trim()}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          Add Q&A
                        </Button>
                      </div>
                    </div>

                    
                    {/* Q&A Sources List */}
                    <div className="mt-6">
                      {trainingSources.some(source => source.source_type === 'qa') && (
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Q&A Sources</h3>

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              const qaSources = trainingSources.filter(source => source.source_type === 'qa');
                              if (qaSources.length > 0 && confirm('Delete all Q&A sources? This action cannot be undone.')) {
                                Promise.all(
                                  qaSources.map(source => 
                                    fetch(`/api/training-sources?id=${source.id}`, { method: 'DELETE' })
                                  )
                                ).then(() => {
                                  setTrainingSources(prev => prev.filter(source => source.source_type !== 'qa'));
                                  toast.success("All Q&A sources deleted");
                                }).catch(error => {
                                  console.error('Error deleting Q&A sources:', error);
                                  toast.error('Failed to delete Q&A sources');
                                });
                              }
                            }}
                            disabled={isLoading || !trainingSources.some(source => source.source_type === 'qa')}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete All
                          </Button>

                      </div>
                      )}
                      
                      {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {trainingSources
                            .filter(source => source.source_type === 'qa')
                            .map((source) => {
                              let qaContent = { question: '', answer: '' };
                              try {
                                if (source.content) {
                                  // Try to extract file name from content
                                  const fileNameMatch = source.content.match(/FILE:\s*(.+?)\n/i);
                                  if (fileNameMatch && fileNameMatch[1]) {
                                    return fileNameMatch[1];
                                  }
                                    
                                  // Fallback to JSON parsing for backward compatibility
                                  try {
                                    qaContent = JSON.parse(source.content);
                                  } catch (jsonError) {
                                     console.error('Error parsing Q&A content JSON:', jsonError);
                                  }
                                }
                              } catch (e) {
                                 console.error('Error processing Q&A source content:', e);
                              }
                              return (
                                <div key={source.id} className="p-2 border rounded-md">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center">
                                      <div className={`px-2 py-1 text-xs rounded-full mr-3 ${
                                        source.status === "trained" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                      }`}>
                                        {source.status === "trained" ? "Trained" : "Pending"}
                                      </div>
                                      <span className="text-xs text-muted-foreground">{source.size_kb > 0 ? formatBytes(source.size_kb * 1024) : '0 Bytes'}</span>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleDeleteSource(source.id)}
                                      disabled={isLoading}
                                      className="h-6 w-6"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">Q: {qaContent.question}</p>
                                    <p className="text-sm text-muted-foreground">A: {qaContent.answer}</p>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                  </CardContent>
                </Card>
                </TabsContent>
                
                <TabsContent value="files" className="space-y-4">
                <Card className="rootcard">
                  <CardContent className="px-6 py-4">
                  <div className="space-y-6">

                    <div className="space-y-1">
                      <h2 className="text-base font-semibold mr-2">Files</h2>
                      <p className="text-sm text-muted-foreground">
                      Upload documents and data files that will be processed and included in your chatbot's training data. 
                      CSV files with question/answer columns will be automatically converted to Q&A pairs.
                      If you are uploading a PDF, make sure you can select/highlight the text.
                      </p>
                    </div>

                    
                    <div 
                      ref={dropZoneRef}
                      className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(true);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
                          setIsDragging(false);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);
                        
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          setUploadedFiles(Array.from(e.dataTransfer.files));
                        }
                      }}
                      onClick={() => {
                        // Only open file dialog if no files are already selected
                        if (uploadedFiles.length === 0) {
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        accept=".pdf,.doc,.docx,.txt,.csv,.json"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setUploadedFiles(Array.from(e.target.files));
                          }
                        }}
                      />
                      
                      <div className="text-center py-5">
                        <h3 className="text-base font-medium mb-1">{isDragging ? 'Drop files here' : 'Drag & drop files here, or click to select files'}</h3>
                        <p className="text-sm text-muted-foreground mb-4">Supported File Types: .pdf, .doc, .docx, .txt, .csv, .json</p>
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          disabled={isUploading}
                        >
                          Select Files
                        </Button>
                      </div>
                      
                      {uploadedFiles.length > 0 && (
                        <div className="w-full mt-4">
                          <h4 className="text-sm font-medium mb-2">Selected Files ({uploadedFiles.length})</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {uploadedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                                <div className="flex items-center">
                                  <File className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-end mt-4 space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setUploadedFiles([]);
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = '';
                                }
                              }}
                              disabled={isUploading}
                            >
                              Clear
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent triggering the dropzone click
                                handleFileUpload(uploadedFiles);
                              }}
                              disabled={isUploading || uploadedFiles.length === 0}
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Uploading... {uploadProgress}%
                                </>
                              ) : (
                                <>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Upload Files
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  
                    
                    {/* File Sources List */}
                    <div className="mt-4">
                      {trainingSources.some(source => source.source_type === 'file') && (
                      <div className="flex justify-between items-center">
                        <h3 className="text-base font-semibold">File Sources</h3>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              const fileSources = trainingSources.filter(source => source.source_type === 'file');
                              if (fileSources.length > 0 && confirm('Delete all file sources? This action cannot be undone.')) {
                                setIsLoading(true);
                                Promise.all(
                                  fileSources.map(source => 
                                    fetch(`/api/training-sources?id=${source.id}`, { method: 'DELETE' })
                                  )
                                ).then(() => {
                                  setTrainingSources(prev => prev.filter(source => source.source_type !== 'file'));
                                  toast.success("All file sources deleted");
                                  setIsLoading(false);
                                }).catch(error => {
                                  console.error('Error deleting file sources:', error);
                                  toast.error('Failed to delete file sources');
                                  setIsLoading(false);
                                });
                              }
                            }}
                            disabled={isLoading || !trainingSources.some(source => source.source_type === 'file')}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete All
                          </Button>
                      </div>
                      )}
                      
                      {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {trainingSources
                            .filter(source => source.source_type === 'file')
                            .map((source) => (
                              <div key={source.id} className="p-2 border rounded-md">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center">
                                    <div className={`px-2 py-1 text-xs rounded-full mr-3 ${
                                      source.status === "trained" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                    }`}>
                                      {source.status === "trained" ? "Trained" : "Pending"}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{source.size_kb > 0 ? formatBytes(source.size_kb * 1024) : '0 Bytes'}</span>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDeleteSource(source.id)}
                                    disabled={isLoading}
                                    className="h-6 w-6"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                                <div className="flex items-center">
                                  <File className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {(() => {
                                      try {
                                        if (source.content) {
                                          // Try to extract file name from content
                                          const fileNameMatch = source.content.match(/FILE:\s*(.+?)\n/i);
                                          if (fileNameMatch && fileNameMatch[1]) {
                                            return fileNameMatch[1];
                                          }
                                          
                                          // Fallback to JSON parsing for backward compatibility
                                          try {
                                            const metadata = JSON.parse(source.content);
                                            if (metadata.fileName) {
                                              return metadata.fileName;
                                            }
                                          } catch (jsonError) {}
                                        }
                                      } catch (e) {}
                                      return source.file_path ? source.file_path.split('/').pop() : 'Unnamed file';
                                    })()}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {(() => {
                                    try {
                                      if (source.content) {
                                        // Try to extract file type from content
                                        const fileTypeMatch = source.content.match(/TYPE:\s*(.+?)\n/i);
                                        if (fileTypeMatch && fileTypeMatch[1]) {
                                          return <span className="uppercase">{fileTypeMatch[1].replace('application/', '')}</span>;
                                        }
                                        
                                        // Fallback to JSON parsing for backward compatibility
                                        try {
                                          const metadata = JSON.parse(source.content);
                                          if (metadata.fileType) {
                                            return <span className="uppercase">{metadata.fileType.replace('application/', '')}</span>;
                                          }
                                        } catch (jsonError) {}
                                      }
                                    } catch (e) {}
                                    return <span className="uppercase">PDF</span>;
                                  })()} 
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  </CardContent>
                </Card>
                </TabsContent>

                <TabsContent value="rss" className="space-y-4">
                  <Card className="rootcard">
                    <CardContent className="px-6 py-4">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h2 className="text-base font-semibold">RSS Feeds</h2>
                          <p className="text-sm text-muted-foreground">
                            Import content from RSS or Atom feeds. This will fetch the last 200 articles and add them to your training data.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <span className="text-sm font-medium">RSS Feed URL</span>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="https://example.com/feed.xml"
                              value={rssUrl}
                              onChange={(e) => setRssUrl(e.target.value)}
                              disabled={isLoadingRss}
                            />
                            <Button 
                              onClick={handleRssImport} 
                              disabled={isLoadingRss || !rssUrl.trim()}
                            >
                              {isLoadingRss ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Importing...
                                </>
                              ) : (
                                "Import Feed"
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <span className="text-xs text-amber-600 font-medium">Note: large feeds may take several minutes. Feed crawling is limited to 3 feeds per 5 minutes.</span>
                          </p>
                        </div>

                        {/* RSS Sources List */}
                        <div className="mt-6">
                          {trainingSources.some(source => source.source_type === 'rss') && (
                            <div className="flex justify-between items-center">
                              <h3 className="text-base font-semibold">RSS Sources</h3>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  const rssSources = trainingSources.filter(source => source.source_type === 'rss');
                                  if (rssSources.length > 0 && confirm('Delete all RSS sources? This action cannot be undone.')) {
                                    setIsLoading(true);
                                    Promise.all(
                                      rssSources.map(source => 
                                        fetch(`/api/training-sources?id=${source.id}`, { method: 'DELETE' })
                                      )
                                    ).then(() => {
                                      setTrainingSources(prev => prev.filter(source => source.source_type !== 'rss'));
                                      toast.success("All RSS sources deleted");
                                      setIsLoading(false);
                                    }).catch(error => {
                                      console.error('Error deleting RSS sources:', error);
                                      toast.error('Failed to delete RSS sources');
                                      setIsLoading(false);
                                    });
                                  }
                                }}
                                disabled={isLoading || !trainingSources.some(source => source.source_type === 'rss')}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete All
                              </Button>
                            </div>
                          )}
                          
                          {isLoading ? (
                            <div className="flex justify-center items-center py-8">
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="space-y-2 mt-2">
                              {trainingSources
                                .filter(source => source.source_type === 'rss')
                                .map((source) => (
                                  <div key={source.id} className="p-2 border rounded-md">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center">
                                        <div className={`px-2 py-1 text-xs rounded-full mr-3 ${
                                          source.status === "trained" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                        }`}>
                                          {source.status === "trained" ? "Trained" : "Pending"}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{source.size_kb > 0 ? formatBytes(source.size_kb * 1024) : '0 Bytes'}</span>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleDeleteSource(source.id)}
                                        disabled={isLoading}
                                        className="h-6 w-6"
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                    <div className="flex items-center">
                                      <LuRss className="h-4 w-4 mr-2 text-muted-foreground" />
                                      <span className="text-sm font-medium">
                                        {(() => {
                                          try {
                                            if (source.content) {
                                              const parsed = JSON.parse(source.content);
                                              return parsed.title || 'RSS Article';
                                            }
                                          } catch (e) {}
                                          return 'RSS Article';
                                        })()}
                                      </span>
                                    </div>
                                    {source.url && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                          {source.url}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="youtube" className="space-y-4">
                  <Card className="rootcard">
                    <CardContent className="px-6 py-4">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h2 className="text-base font-semibold">YouTube Videos</h2>
                          <p className="text-sm text-muted-foreground">
                            Import metadata and transcripts (if available) from YouTube videos. Note: Youtube's API has strict rate limits so scraping with an outside service and uploading as a file may be neccesary for large videosets.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <span className="text-sm font-medium">YouTube URL</span>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="https://www.youtube.com/watch?v=..."
                              value={youtubeUrl}
                              onChange={(e) => setYoutubeUrl(e.target.value)}
                              disabled={isLoadingYoutube}
                            />
                            <Button 
                              onClick={handleYoutubeImport} 
                              disabled={isLoadingYoutube || !youtubeUrl.trim()}
                            >
                              {isLoadingYoutube ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Importing...
                                </>
                              ) : (
                                "Import Video"
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* YouTube Sources List */}
                        <div className="mt-6">
                          {trainingSources.some(source => source.source_type === 'youtube') && (
                            <div className="flex justify-between items-center">
                              <h3 className="text-base font-semibold">YouTube Sources</h3>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  const youtubeSources = trainingSources.filter(source => source.source_type === 'youtube');
                                  if (youtubeSources.length > 0 && confirm('Delete all YouTube sources? This action cannot be undone.')) {
                                    setIsLoading(true);
                                    Promise.all(
                                      youtubeSources.map(source => 
                                        fetch(`/api/training-sources?id=${source.id}`, { method: 'DELETE' })
                                      )
                                    ).then(() => {
                                      setTrainingSources(prev => prev.filter(source => source.source_type !== 'youtube'));
                                      toast.success("All YouTube sources deleted");
                                      setIsLoading(false);
                                    }).catch(error => {
                                      console.error('Error deleting YouTube sources:', error);
                                      toast.error('Failed to delete YouTube sources');
                                      setIsLoading(false);
                                    });
                                  }
                                }}
                                disabled={isLoading || !trainingSources.some(source => source.source_type === 'youtube')}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete All
                              </Button>
                            </div>
                          )}
                          
                          {isLoading ? (
                            <div className="flex justify-center items-center py-8">
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="space-y-2 mt-2">
                              {trainingSources
                                .filter(source => source.source_type === 'youtube')
                                .map((source) => (
                                  <div key={source.id} className="p-2 border rounded-md">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center">
                                        <div className={`px-2 py-1 text-xs rounded-full mr-3 ${
                                          source.status === "trained" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                        }`}>
                                          {source.status === "trained" ? "Trained" : "Pending"}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{source.size_kb > 0 ? formatBytes(source.size_kb * 1024) : '0 Bytes'}</span>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleDeleteSource(source.id)}
                                        disabled={isLoading}
                                        className="h-6 w-6"
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                    <div className="flex items-center">
                                      <LuYoutube className="h-4 w-4 mr-2 text-muted-foreground" />
                                      <span className="text-sm font-medium">
                                        {(() => {
                                          try {
                                            if (source.content) {
                                              const parsed = JSON.parse(source.content);
                                              return parsed.title || 'YouTube Video';
                                            }
                                          } catch (e) {}
                                          return 'YouTube Video';
                                        })()}
                                      </span>
                                    </div>
                                    {source.url && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                          {source.url}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
        </div>
        
        <div className="lg:col-span-3">
          <Card className="rootcard">
            <CardContent className="px-6 py-4 text-sm">
              <h2 className="text-base font-semibold mb-4">Summary</h2>
              
              <div className="space-y-3">

                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    <span>{sourceStats.qaSources} Q&As</span>
                  </div>
                  <span>{formatBytes(sourceStats.qaSizeBytes)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <LuText className="h-4 w-4 mr-2" />
                    <span>{sourceStats.textSources} Raw Text</span>
                  </div>
                  <span>{formatBytes(sourceStats.textSizeBytes)}</span>
                </div>            
                             
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <File className="h-4 w-4 mr-2" />
                    <span>{sourceStats.fileSources} Files</span>
                  </div>
                  <span>{formatBytes(sourceStats.fileSizeBytes)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 mr-2" />
                    <span>{sourceStats.websiteSources} URLs</span>
                  </div>
                  <span>{formatBytes(sourceStats.websiteSizeBytes)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <LuRss className="h-4 w-4 mr-2" />
                    <span>{sourceStats.rssSources} RSS</span>
                  </div>
                  <span>{formatBytes(sourceStats.rssSizeBytes)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <LuYoutube className="h-4 w-4 mr-2" />
                    <span>{sourceStats.youtubeSources} YouTube</span>
                  </div>
                  <span>{formatBytes(sourceStats.youtubeSizeBytes)}</span>
                </div>
                
                <div className="border-t pt-3 mt-5">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total size:</span>
                    <div className="text-right">
                      <div>{formatBytes(sourceStats.totalSizeBytes)}</div>
                      <div className="text-xs text-muted-foreground">/ {TRAINING_DATA.DEFAULT_LIMIT_MB} MB</div>
                    </div>
                  </div>
                  
                  {/* Warning when approaching limit */}
                  {sourceStats.totalSizeBytes > TRAINING_DATA.WARNING_THRESHOLD_MB * 1024 * 1024 && ( // Warn when over threshold
                    <div className="mt-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2">
                      ⚠️ You're using {((sourceStats.totalSizeBytes / (TRAINING_DATA.DEFAULT_LIMIT_MB * 1024 * 1024)) * 100).toFixed(1)}% of your training data limit. 
                      You have {formatBytes(TRAINING_DATA.DEFAULT_LIMIT_MB * 1024 * 1024 - sourceStats.totalSizeBytes)} remaining.
                    </div>
                  )}
                  
                  {/* Error when at or over limit */}
                  {sourceStats.totalSizeBytes >= TRAINING_DATA.DEFAULT_LIMIT_MB * 1024 * 1024 && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                      🚫 You've reached your {TRAINING_DATA.DEFAULT_LIMIT_MB} MB training data limit. Remove some content or upgrade your plan to add more.
                    </div>
                  )}
                </div>
                
                {sourceStats.pendingCount > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
                    <div className="flex items-center text-yellow-800 font-medium mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Training Required
                    </div>
                    <p className="text-yellow-700 ml-7">
                      You have {sourceStats.pendingCount} {sourceStats.pendingCount === 1 ? 'source' : 'sources'} that {sourceStats.pendingCount === 1 ? 'needs' : 'need'} to be trained.
                    </p>
                  </div>
                )}
                
                <Button 
                  className="w-full" 
                  onClick={handleRetrainAgent} 
                  disabled={isLoading || isTraining || trainingSources.length === 0}
                >
                  {isTraining ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Training in progress...
                    </>
                  ) : isLoading ? (
                    "Loading..."
                  ) : sourceStats.pendingCount > 0 ? (
                    "Train sources"
                  ) : (
                    "Retrain agent"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
