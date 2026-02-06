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
              onClick={() => setView('master')}
              className={`px-4 py-2 rounded-lg font-medium ${view === 'master' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Master Library
            </button>
            <button
              onClick={() => setView('weekly')}
              className={`px-4 py-2 rounded-lg font-medium ${view === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Weekly Session Plans
            </button>
            <button
              onClick={() => setView('add')}
              className={`px-4 py-2 rounded-lg font-medium ${view === 'add' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add New Content
            </button>
          </div>
        </div>

        {view === 'master' && (
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

        {view === 'weekly' && (
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
      </div>
    </div>
  )
}