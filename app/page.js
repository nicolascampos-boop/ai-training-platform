// app/page.js
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Download, Plus, Edit2, Trash2, Save, X, Calendar, Clock, AlertCircle, Book, Video, Code, FileText } from 'lucide-react'

const contentTypeOptions = ["Article", "Video", "Tutorial", "Documentation", "Tool", "Course"]
const topicOptions = [
  "AI Fundamentals",
  "Prompt Engineering",
  "Workflow Automation",
  "Agent Development",
  "AI-Assisted Coding",
  "Implementation Strategy",
  "Platform Deep-Dives",
  "Applied Use Cases"
]
const skillLevelOptions = ["Beginner", "Intermediate", "Advanced"]
const modalityOptions = ["Read/Watch", "Hands-On", "Discussion", "Mixed"]
const statusOptions = ["To Review", "Core", "Supplemental", "Archive"]
const weekOptions = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Ongoing", "Optional"]

export default function Home() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('master')
  const [importData, setImportData] = useState('')
  const [importPreview, setImportPreview] = useState([])
  const [showImportPreview, setShowImportPreview] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    contentType: '',
    primaryTopic: '',
    skillLevel: '',
    weekSuggested: '',
    statusPriority: ''
  })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [newItem, setNewItem] = useState({
    title: '',
    link: '',
    content_type: 'Article',
    primary_topic: 'AI Fundamentals',
    skill_level: 'Beginner',
    tools_covered: '',
    learning_modality: 'Read/Watch',
    time_investment: '',
    quality_rating: null,
    relevance_score: null,
    status_priority: 'To Review',
    use_case_tags: '',
    your_notes: '',
    week_suggested: 'Week 1'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: resources, error } = await supabase
        .from('resources')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error
      setData(resources || [])
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Failed to load data. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  const addNewItem = async () => {
    try {
      setSaving(true)
      const { data: newData, error } = await supabase
        .from('resources')
        .insert([newItem])
        .select()

      if (error) throw error

      setData([...data, newData[0]])
      setNewItem({
        title: '',
        link: '',
        content_type: 'Article',
        primary_topic: 'AI Fundamentals',
        skill_level: 'Beginner',
        tools_covered: '',
        learning_modality: 'Read/Watch',
        time_investment: '',
        quality_rating: null,
        relevance_score: null,
        status_priority: 'To Review',
        use_case_tags: '',
        your_notes: '',
        week_suggested: 'Week 1'
      })
      setView('master')
      alert('Resource added successfully!')
    } catch (error) {
      console.error('Error adding resource:', error)
      alert('Failed to add resource. Check console for details.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditForm({ ...item })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const saveEdit = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('resources')
        .update(editForm)
        .eq('id', editingId)

      if (error) throw error

      setData(data.map(item => item.id === editingId ? editForm : item))
      setEditingId(null)
      setEditForm(null)
      alert('Changes saved successfully!')
    } catch (error) {
      console.error('Error updating resource:', error)
      alert('Failed to save changes. Check console for details.')
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id)

      if (error) throw error

      setData(data.filter(item => item.id !== id))
      alert('Resource deleted successfully!')
    } catch (error) {
      console.error('Error deleting resource:', error)
      alert('Failed to delete resource. Check console for details.')
    } finally {
      setSaving(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['title', 'link', 'content_type', 'primary_topic', 'skill_level', 'tools_covered', 'learning_modality', 'time_investment', 'quality_rating', 'relevance_score', 'status_priority', 'use_case_tags', 'your_notes', 'week_suggested']
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ai-training-library.csv'
    a.click()
  }

  const downloadTemplate = () => {
    const headers = ['title', 'link', 'content_type', 'primary_topic', 'skill_level', 'tools_covered', 'learning_modality', 'time_investment', 'quality_rating', 'relevance_score', 'status_priority', 'use_case_tags', 'your_notes', 'week_suggested']
    const exampleRow = [
      'Example: AI Fundamentals Guide',
      'https://example.com',
      'Article',
      'AI Fundamentals',
      'Beginner',
      'Claude, GPT-4',
      'Read/Watch',
      '30min',
      '5',
      '5',
      'Core',
      'Learning, Understanding',
      'Great introduction to AI concepts',
      'Week 1'
    ]
    const csv = [
      headers.join(','),
      exampleRow.map(val => `"${val}"`).join(',')
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import-template.csv'
    a.click()
  }

  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) {
      alert('CSV file is empty or only has headers')
      return []
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
    const rows = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())
      const row = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      // Convert ratings to numbers
      if (row.quality_rating) row.quality_rating = parseInt(row.quality_rating) || null
      if (row.relevance_score) row.relevance_score = parseInt(row.relevance_score) || null

      // Validate required fields
      if (row.title && row.link) {
        rows.push(row)
      }
    }

    return rows
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const csvText = event.target.result
      const parsed = parseCSV(csvText)
      
      if (parsed.length > 0) {
        setImportPreview(parsed)
        setShowImportPreview(true)
      } else {
        alert('No valid rows found in CSV')
      }
    }
    reader.readAsText(file)
  }

  const handlePasteImport = () => {
    if (!importData.trim()) {
      alert('Please paste CSV data first')
      return
    }

    const parsed = parseCSV(importData)
    if (parsed.length > 0) {
      setImportPreview(parsed)
      setShowImportPreview(true)
    } else {
      alert('No valid rows found in pasted data')
    }
  }

  const confirmImport = async () => {
    try {
      setSaving(true)
      
      const { data: insertedData, error } = await supabase
        .from('resources')
        .insert(importPreview)
        .select()

      if (error) throw error

      setData([...data, ...insertedData])
      setImportPreview([])
      setShowImportPreview(false)
      setImportData('')
      alert(`Successfully imported ${insertedData.length} resources!`)
      setView('master')
    } catch (error) {
      console.error('Error importing:', error)
      alert('Failed to import resources. Check console for details.')
    } finally {
      setSaving(false)
    }
  }

  const cancelImport = () => {
    setImportPreview([])
    setShowImportPreview(false)
  }

  const filteredData = data.filter(item => {
    const matchesSearch = !searchTerm || 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.your_notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.use_case_tags?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilters = 
      (!filters.contentType || item.content_type === filters.contentType) &&
      (!filters.primaryTopic || item.primary_topic === filters.primaryTopic) &&
      (!filters.skillLevel || item.skill_level === filters.skillLevel) &&
      (!filters.weekSuggested || item.week_suggested === filters.weekSuggested) &&
      (!filters.statusPriority || item.status_priority === filters.statusPriority)
    
    return matchesSearch && matchesFilters
  })

  const weeklyData = weekOptions.reduce((acc, week) => {
    acc[week] = data.filter(item => item.week_suggested === week)
    return acc
  }, {})

  const stats = {
    total: data.length,
    core: data.filter(d => d.status_priority === 'Core').length,
    toReview: data.filter(d => d.status_priority === 'To Review').length,
    avgQuality: data.filter(d => d.quality_rating).length > 0 
      ? (data.filter(d => d.quality_rating).reduce((sum, d) => sum + d.quality_rating, 0) / data.filter(d => d.quality_rating).length).toFixed(1)
      : 'N/A',
    avgRelevance: data.filter(d => d.relevance_score).length > 0
      ? (data.filter(d => d.relevance_score).reduce((sum, d) => sum + d.relevance_score, 0) / data.filter(d => d.relevance_score).length).toFixed(1)
      : 'N/A'
  }

  const getContentIcon = (type) => {
    switch(type) {
      case 'Video': return <Video className="w-4 h-4" />
      case 'Tutorial': return <Code className="w-4 h-4" />
      case 'Documentation': return <Book className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getRatingColor = (rating) => {
    if (!rating) return 'bg-gray-200'
    if (rating >= 4) return 'bg-green-500'
    if (rating >= 3) return 'bg-blue-500'
    if (rating >= 2) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-700 mb-2">Loading AI Training Library...</div>
          <div className="text-sm text-gray-500">Connecting to Supabase database</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Training Course Library</h1>
              <p className="text-gray-600">Curated content for lab-based AI learning experience</p>
              {saving && (
                <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                  <Save className="w-4 h-4 animate-pulse" />
                  Saving changes...
                </div>
              )}
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-blue-900">Connected to Supabase</div>
                <div className="text-sm text-blue-700">Your data is securely stored and synced in real-time across all users.</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4 mt-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Resources</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-900">{stats.core}</div>
              <div className="text-sm text-green-600">Core Content</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-900">{stats.toReview}</div>
              <div className="text-sm text-yellow-600">To Review</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{stats.avgQuality}</div>
              <div className="text-sm text-blue-600">Avg Quality</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">{stats.avgRelevance}</div>
              <div className="text-sm text-purple-600">Avg Relevance</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setView('weekly')}
              className={`px-4 py-2 rounded-lg font-medium ${view === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Weekly Session Plans
            </button>
            <button
              onClick={() => setView('master')}
              className={`px-4 py-2 rounded-lg font-medium ${view === 'master' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Master Library
            </button>
            <button
              onClick={() => setView('add')}
              className={`px-4 py-2 rounded-lg font-medium ${view === 'add' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add New Content
            </button>
            <button
              onClick={() => setView('import')}
              className={`px-4 py-2 rounded-lg font-medium ${view === 'import' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Download className="w-4 h-4 inline mr-2" />
              Bulk Import
            </button>
          </div>
        </div>

        {view === 'weekly' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by title, notes, or use cases..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-5 gap-4">
                <select
                  value={filters.contentType}
                  onChange={(e) => setFilters({...filters, contentType: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                >
                  <option value="">All Types</option>
                  {contentTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                
                <select
                  value={filters.primaryTopic}
                  onChange={(e) => setFilters({...filters, primaryTopic: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                >
                  <option value="">All Topics</option>
                  {topicOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                
                <select
                  value={filters.skillLevel}
                  onChange={(e) => setFilters({...filters, skillLevel: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                >
                  <option value="">All Levels</option>
                  {skillLevelOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                
                <select
                  value={filters.weekSuggested}
                  onChange={(e) => setFilters({...filters, weekSuggested: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                >
                  <option value="">All Weeks</option>
                  {weekOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                
                <select
                  value={filters.statusPriority}
                  onChange={(e) => setFilters({...filters, statusPriority: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                >
                  <option value="">All Status</option>
                  {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-4">
              {filteredData.map(item => (
                <div key={item.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                  {editingId === item.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                          <input
                            type="url"
                            value={editForm.link}
                            onChange={(e) => setEditForm({...editForm, link: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quality Rating (1-5)</label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={editForm.quality_rating || ''}
                            onChange={(e) => setEditForm({...editForm, quality_rating: e.target.value ? parseInt(e.target.value) : null})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Relevance Score (1-5)</label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={editForm.relevance_score || ''}
                            onChange={(e) => setEditForm({...editForm, relevance_score: e.target.value ? parseInt(e.target.value) : null})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Notes</label>
                        <textarea
                          value={editForm.your_notes || ''}
                          onChange={(e) => setEditForm({...editForm, your_notes: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-400"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          {getContentIcon(item.content_type)}
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                            <a 
                              href={item.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 break-all"
                            >
                              {item.link}
                            </a>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{item.content_type}</span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{item.primary_topic}</span>
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            item.skill_level === 'Beginner' ? 'bg-green-100 text-green-700' :
                            item.skill_level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{item.skill_level}</span>
                          {item.time_investment && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.time_investment}
                            </span>
                          )}
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">{item.week_suggested}</span>
                        </div>

                        {item.your_notes && (
                          <p className="text-sm text-gray-600 mb-3">{item.your_notes}</p>
                        )}

                        <div className="flex items-center gap-4">
                          {item.quality_rating && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Quality:</span>
                              <div className={`w-8 h-8 rounded ${getRatingColor(item.quality_rating)} text-white text-sm flex items-center justify-center font-bold`}>
                                {item.quality_rating}
                              </div>
                            </div>
                          )}
                          {item.relevance_score && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Relevance:</span>
                              <div className={`w-8 h-8 rounded ${getRatingColor(item.relevance_score)} text-white text-sm flex items-center justify-center font-bold`}>
                                {item.relevance_score}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'master' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">6-Week Course Structure</h2>
              <div className="space-y-6">
                {['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'].map(week => (
                  <div key={week} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-bold text-gray-900">{week}</h3>
                      <span className="text-sm text-gray-500">({weeklyData[week]?.length || 0} resources)</span>
                    </div>
                    
                    <div className="space-y-2">
                      {weeklyData[week]?.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getContentIcon(item.content_type)}
                            <div>
                              <div className="font-medium text-gray-900">{item.title}</div>
                              <div className="text-xs text-gray-500">
                                {item.primary_topic} • {item.skill_level} • {item.time_investment}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.quality_rating && (
                              <div className={`w-6 h-6 rounded ${getRatingColor(item.quality_rating)} text-white text-xs flex items-center justify-center font-bold`}>
                                {item.quality_rating}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'add' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Content</h2>
            <div className="space-y-4 max-w-3xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Resource title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Link *</label>
                <input
                  type="url"
                  value={newItem.link}
                  onChange={(e) => setNewItem({...newItem, link: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                  <select
                    value={newItem.content_type}
                    onChange={(e) => setNewItem({...newItem, content_type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    {contentTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Topic</label>
                  <select
                    value={newItem.primary_topic}
                    onChange={(e) => setNewItem({...newItem, primary_topic: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    {topicOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
                  <select
                    value={newItem.skill_level}
                    onChange={(e) => setNewItem({...newItem, skill_level: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    {skillLevelOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Week Suggested</label>
                  <select
                    value={newItem.week_suggested}
                    onChange={(e) => setNewItem({...newItem, week_suggested: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    {weekOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Investment</label>
                  <input
                    type="text"
                    value={newItem.time_investment}
                    onChange={(e) => setNewItem({...newItem, time_investment: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    placeholder="30min, 1hr, 2hrs"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tools Covered</label>
                  <input
                    type="text"
                    value={newItem.tools_covered}
                    onChange={(e) => setNewItem({...newItem, tools_covered: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    placeholder="Claude, Make, Cursor"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Notes</label>
                <textarea
                  value={newItem.your_notes}
                  onChange={(e) => setNewItem({...newItem, your_notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  rows={3}
                  placeholder="Add your personal notes and comments..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={addNewItem}
                  disabled={!newItem.title || !newItem.link || saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {saving ? 'Adding...' : 'Add Content'}
                </button>
                <button
                  onClick={() => setView('master')}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'import' && (
          <div className="space-y-6">
            {!showImportPreview ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Bulk Import Resources</h2>
                
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h3 className="font-bold text-blue-900 mb-3">📋 How to Import Resources</h3>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p><strong>Step 1:</strong> Download the CSV template to see the exact format required</p>
                    <p><strong>Step 2:</strong> Fill in your resources following the column headers</p>
                    <p><strong>Step 3:</strong> Upload the CSV file or paste the data below</p>
                    <p><strong>Step 4:</strong> Review the preview and confirm import</p>
                  </div>
                </div>

                {/* Template Download */}
                <div className="mb-6">
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    <Download className="w-5 h-5" />
                    Download CSV Template
                  </button>
                  <p className="text-sm text-gray-600 mt-2">Get a template with correct headers and an example row</p>
                </div>

                {/* Column Headers Guide */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="font-bold text-gray-900 mb-4">📝 Required Column Headers (in exact order):</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">1. <code className="bg-gray-200 px-2 py-1 rounded">title</code></p>
                      <p className="text-gray-600 ml-4">Resource name (required)</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">2. <code className="bg-gray-200 px-2 py-1 rounded">link</code></p>
                      <p className="text-gray-600 ml-4">Full URL (required)</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">3. <code className="bg-gray-200 px-2 py-1 rounded">content_type</code></p>
                      <p className="text-gray-600 ml-4">Article, Video, Tutorial, Documentation, Tool, Course</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">4. <code className="bg-gray-200 px-2 py-1 rounded">primary_topic</code></p>
                      <p className="text-gray-600 ml-4">AI Fundamentals, Prompt Engineering, etc.</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">5. <code className="bg-gray-200 px-2 py-1 rounded">skill_level</code></p>
                      <p className="text-gray-600 ml-4">Beginner, Intermediate, Advanced</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">6. <code className="bg-gray-200 px-2 py-1 rounded">tools_covered</code></p>
                      <p className="text-gray-600 ml-4">Claude, Make, Cursor (optional)</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">7. <code className="bg-gray-200 px-2 py-1 rounded">learning_modality</code></p>
                      <p className="text-gray-600 ml-4">Read/Watch, Hands-On, Discussion, Mixed</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">8. <code className="bg-gray-200 px-2 py-1 rounded">time_investment</code></p>
                      <p className="text-gray-600 ml-4">30min, 1hr, etc.</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">9. <code className="bg-gray-200 px-2 py-1 rounded">quality_rating</code></p>
                      <p className="text-gray-600 ml-4">Number 1-5</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">10. <code className="bg-gray-200 px-2 py-1 rounded">relevance_score</code></p>
                      <p className="text-gray-600 ml-4">Number 1-5</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">11. <code className="bg-gray-200 px-2 py-1 rounded">status_priority</code></p>
                      <p className="text-gray-600 ml-4">To Review, Core, Supplemental, Archive</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">12. <code className="bg-gray-200 px-2 py-1 rounded">use_case_tags</code></p>
                      <p className="text-gray-600 ml-4">Tags separated by commas</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">13. <code className="bg-gray-200 px-2 py-1 rounded">your_notes</code></p>
                      <p className="text-gray-600 ml-4">Personal notes (optional)</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">14. <code className="bg-gray-200 px-2 py-1 rounded">week_suggested</code></p>
                      <p className="text-gray-600 ml-4">Week 1-6, Ongoing, Optional</p>
                    </div>
                  </div>
                </div>

                {/* Upload Options */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3">Option 1: Upload CSV File</h3>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">OR</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 mb-3">Option 2: Paste CSV Data</h3>
                    <textarea
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                      className="w-full h-48 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm text-gray-900 bg-white"
                      placeholder="Paste your CSV data here (including headers)..."
                    />
                    <button
                      onClick={handlePasteImport}
                      disabled={!importData.trim()}
                      className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Preview Import
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Preview Import ({importPreview.length} resources)</h2>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800">
                    <strong>⚠️ Review carefully:</strong> These {importPreview.length} resources will be added to your library.
                  </p>
                </div>

                <div className="max-h-96 overflow-auto mb-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Topic</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Week</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {importPreview.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.content_type}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.primary_topic}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.week_suggested}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={confirmImport}
                    disabled={saving}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
                  >
                    {saving ? 'Importing...' : `Confirm Import (${importPreview.length} resources)`}
                  </button>
                  <button
                    onClick={cancelImport}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}