import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, CATEGORY_GRADE_ORDER } from './utils/categories'

export default function TrainingCategorySelection() {
  const navigate = useNavigate()
  const categoryGroups = useMemo(() => {
    // First, merge entries that share the same homepageGroup into a single grouped card.
    const mergedByGrade = {};
    const seenGroups = {};

    Object.entries(CATEGORIES).forEach(([key, config]) => {
      const grade = config.grade || 'Weitere Kategorien';
      if (!mergedByGrade[grade]) mergedByGrade[grade] = [];

      if (config.homepageGroup) {
        const groupId = `${grade}::${config.homepageGroup}`;
        if (!seenGroups[groupId]) {
          seenGroups[groupId] = {
            key: config.homepageGroup,
            label: config.homepageGroupLabel || config.homepageGroup,
            grade,
            isGroup: true,
            members: [],
          };
          mergedByGrade[grade].push(seenGroups[groupId]);
        }
        seenGroups[groupId].members.push({ key, label: config.homepageLabel || config.label });
      } else {
        mergedByGrade[grade].push({ key, label: config.label, isGroup: false });
      }
    });

    return [...CATEGORY_GRADE_ORDER, ...Object.keys(mergedByGrade).filter(g => !CATEGORY_GRADE_ORDER.includes(g))]
      .filter(grade => mergedByGrade[grade]?.length)
      .map(grade => ({ grade, categories: mergedByGrade[grade] }));
  }, []);

  const navigateToTraining = categoryKey => navigate(`/training/${categoryKey}`)

  return (
            <div className="category-selection category-selection-wide category-selection-minimal">
              <div className="category-grade-groups">
                {categoryGroups.map(({ grade, categories }) => (
                  <section key={grade} className="category-grade-group">
                    <div className="category-grade-header">{grade}</div>
                    <div className="category-buttons category-buttons-grid">
                      {categories.map((config) => (
                        config.isGroup ? (
                          <div key={config.key} className="category-btn category-card category-card-static" role="group" aria-label={config.label}>
                            <span className="category-card-title">{config.label}</span>
                            <div className="category-subactions">
                              {config.members.map((member) => (
                                <button
                                  key={member.key}
                                  type="button"
                                  className="category-subbtn"
                                  onClick={() => navigateToTraining(member.key)}
                                  aria-label={`${config.label} ${member.label}`}
                                >
                                  {member.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <button
                            key={config.key}
                            className="category-btn category-card"
                            onClick={() => navigateToTraining(config.key)}
                            type="button"
                          >
                            <span>{config.label}</span>
                          </button>
                        )
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
  )
}
